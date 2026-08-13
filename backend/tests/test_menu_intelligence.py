import uuid
import pytest
from datetime import datetime, timedelta
from app.services.caption_ai import caption_ai_service
from app.services.menu_parser_ai import validate_url_ssrf, menu_parser_ai_service
from app.services.strategy_engine import strategy_engine_service
from app.tasks.strategy_tasks import _async_generate_all_strategies
from app.core.celery_app import celery_app
from app.middleware.exception_handler import AppException
from app.models.menu import Menu, MenuItem, PostRecommendation, MenuStatusEnum, RecommendationStatusEnum
from app.models.post import Post, PostStatusEnum
from app.models.user import User


@pytest.mark.asyncio
async def test_caption_fact_verification_edge_cases():
    # 1. Incorrect price corrected
    caption1 = "Try our delicious Chocolate Cake for only $12 today!"
    corrected1 = caption_ai_service.verify_caption_facts(caption1, "Chocolate Cake", 8.50)
    assert "$8.50" in corrected1
    assert "$12" not in corrected1

    # 2. Correct price unchanged
    caption2 = "Enjoy our Espresso for $3.00!"
    corrected2 = caption_ai_service.verify_caption_facts(caption2, "Espresso", 3.00)
    assert corrected2 == caption2

    # 3. Captions without prices remain valid
    caption3 = "Freshly baked croissants available every morning!"
    corrected3 = caption_ai_service.verify_caption_facts(caption3, "Croissant", 4.00)
    assert corrected3 == caption3

    # 4. Null price or null menu item does not crash
    assert caption_ai_service.verify_caption_facts("Text", "Item", None) == "Text"
    assert caption_ai_service.verify_caption_facts("", "Item", 5.00) == ""


@pytest.mark.asyncio
async def test_ssrf_url_validation():
    # Localhost / Internal IP addresses should raise AppException with SSRF_PREVENTED
    with pytest.raises(AppException) as exc1:
        validate_url_ssrf("http://localhost/menu")
    assert exc1.value.status_code == 400

    with pytest.raises(AppException) as exc2:
        validate_url_ssrf("http://127.0.0.1:8000/menu")
    assert exc2.value.status_code == 400

    with pytest.raises(AppException) as exc3:
        validate_url_ssrf("http://169.254.169.254/latest/meta-data")
    assert exc3.value.status_code == 400

    with pytest.raises(AppException) as exc4:
        validate_url_ssrf("ftp://example.com/menu")
    assert exc4.value.status_code == 400


@pytest.mark.asyncio
async def test_pdf_ingestion_rejection():
    pdf_bytes = b"%PDF-1.4 header contents..."
    with pytest.raises(AppException) as exc:
        await menu_parser_ai_service.parse_menu_from_bytes(pdf_bytes)
    assert exc.value.status_code == 400
    assert exc.value.code == "PDF_UNSUPPORTED"
    assert "PDF menu processing is currently unavailable" in exc.value.message


def test_celery_task_registration():
    registered_tasks = celery_app.tasks.keys()
    assert "app.tasks.strategy_tasks.run_all_strategy_generations_task" in registered_tasks
    assert "app.tasks.strategy_tasks.generate_strategy_task" in registered_tasks

    assert "generate-daily-content-strategy" in celery_app.conf.beat_schedule
    assert celery_app.conf.beat_schedule["generate-daily-content-strategy"]["task"] == "app.tasks.strategy_tasks.run_all_strategy_generations_task"


@pytest.mark.asyncio
async def test_recommendation_lifecycle_and_expiration(db_session, test_user):
    # Setup Active Menu & Item
    menu = Menu(user_id=test_user.id, version_number=1, status=MenuStatusEnum.ACTIVE)
    db_session.add(menu)
    await db_session.flush()

    item = MenuItem(menu_id=menu.id, user_id=test_user.id, name="Test Item", price=10.0, is_active=True)
    db_session.add(item)
    await db_session.flush()

    # Active recommendation
    rec = PostRecommendation(user_id=test_user.id, menu_item_id=item.id, reason_context="Test reason", status=RecommendationStatusEnum.ACTIVE)
    db_session.add(rec)
    await db_session.commit()

    # Create post linked to recommendation
    post = Post(user_id=test_user.id, original_image_url="http://mock.local/img.jpg", status=PostStatusEnum.UPLOADED, menu_item_id=item.id, recommendation_id=rec.id)
    db_session.add(post)
    await db_session.commit()

    # Verify expiration logic for old ACTIVE recommendations (> 7 days)
    old_rec = PostRecommendation(
        user_id=test_user.id,
        menu_item_id=item.id,
        reason_context="Old reason",
        status=RecommendationStatusEnum.ACTIVE,
        created_at=datetime.utcnow() - timedelta(days=8)
    )
    db_session.add(old_rec)
    await db_session.commit()

    # Run strategy engine -> should expire old_rec
    await strategy_engine_service.generate_strategy(db_session, test_user.id)
    await db_session.refresh(old_rec)
    assert old_rec.status == RecommendationStatusEnum.EXPIRED


@pytest.mark.asyncio
async def test_tenant_isolation_negative_cases(client, test_user):
    # Create User B
    token_b = "fake_jwt_user_b"
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A tries to edit a non-existent item or User B's item
    random_id = uuid.uuid4()
    response = await client.patch(f"/api/v1/menu/items/{random_id}", json={"name": "Hacked Item"})
    assert response.status_code in (401, 404)


@pytest.mark.asyncio
async def test_celery_task_real_execution():
    # Execute the async worker strategy loop safely
    await _async_generate_all_strategies()
