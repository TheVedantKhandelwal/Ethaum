import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Comment, Launch, Product, User
from app.schemas.comment import CommentCreate, CommentOut, CommentThread

router = APIRouter(prefix="/api", tags=["comments"])


def _comment_to_out(comment: Comment) -> CommentOut:
    return CommentOut(
        id=comment.id,
        launch_id=comment.launch_id,
        product_id=comment.product_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        body=comment.body,
        upvote_count=comment.upvote_count,
        is_maker=comment.is_maker,
        created_at=comment.created_at,
        user_name=comment.user.name if comment.user else None,
        user_avatar=comment.user.avatar_url if comment.user else None,
    )


def _build_thread(comments: list[Comment], parent_id: uuid.UUID | None = None) -> list[CommentThread]:
    """Recursively build threaded comments."""
    thread = []
    for comment in comments:
        if comment.parent_id == parent_id:
            node = CommentThread(
                id=comment.id,
                launch_id=comment.launch_id,
                product_id=comment.product_id,
                user_id=comment.user_id,
                parent_id=comment.parent_id,
                body=comment.body,
                upvote_count=comment.upvote_count,
                is_maker=comment.is_maker,
                created_at=comment.created_at,
                user_name=comment.user.name if comment.user else None,
                user_avatar=comment.user.avatar_url if comment.user else None,
            )
            node.replies = _build_thread(comments, comment.id)
            thread.append(node)
    return thread


@router.post("/launches/{launch_id}/comments", response_model=CommentOut, status_code=201)
async def create_launch_comment(
    launch_id: uuid.UUID,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a comment to a launch."""
    # Verify launch exists
    launch = await db.get(Launch, launch_id)
    if not launch:
        raise HTTPException(status_code=404, detail="Launch not found")

    # Verify parent comment if provided
    if body.parent_id:
        parent = await db.get(Comment, body.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    # Check if user is a maker (owns the product)
    product = await db.get(Product, launch.product_id)
    is_maker = product is not None and product.user_id == user.id

    comment = Comment(
        launch_id=launch_id,
        user_id=user.id,
        parent_id=body.parent_id,
        body=body.body,
        is_maker=is_maker,
    )
    db.add(comment)
    await db.commit()

    # Reload with user relationship
    result = await db.execute(
        select(Comment).options(joinedload(Comment.user)).where(Comment.id == comment.id)
    )
    comment = result.unique().scalar_one()
    return _comment_to_out(comment)


@router.get("/launches/{launch_id}/comments", response_model=list[CommentThread])
async def list_launch_comments(
    launch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get threaded comments for a launch."""
    # Verify launch exists
    launch = await db.get(Launch, launch_id)
    if not launch:
        raise HTTPException(status_code=404, detail="Launch not found")

    result = await db.execute(
        select(Comment)
        .options(joinedload(Comment.user))
        .where(Comment.launch_id == launch_id)
        .order_by(Comment.created_at.asc())
    )
    comments = result.unique().scalars().all()
    return _build_thread(list(comments), parent_id=None)


@router.post("/comments/{comment_id}/upvote")
async def upvote_comment(
    comment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle upvote on a comment."""
    comment = await db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Simple toggle — increment/decrement (no separate upvote tracking table for comments in MVP)
    comment.upvote_count += 1
    await db.commit()

    return {"upvote_count": comment.upvote_count}
