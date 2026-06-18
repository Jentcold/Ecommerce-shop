import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from dependencies import get_db, get_current_user
from models.reviews import Review
from models.orders import Order, OrderItem, OrderStatus
from models.users import User
from schemas.reviews import ReviewCreate, ReviewResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reviews", tags=["Reviews"])


def _hydrate_review_metadata(review, db):
    """Safely attaches contextual metadata to a review object for responses."""
    # 1. Attach username context
    user = db.query(User).filter(User.id == review.user_id).first()
    review.username = user.username if user else "Customer"
    
    # 2. Attach product name using your model's relationship
    if review.product:
        review.product_name = review.product.name
    else:
        review.product_name = f"Product #{review.product_id}"
        
    return review


@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify the order belongs to this user and is delivered
    order = db.query(Order).filter(
        Order.id == payload.order_id,
        Order.user_id == current_user.id,
        Order.status == OrderStatus.delivered,
    ).first()

    if not order:
        raise HTTPException(
            status_code=403,
            detail="You can only review items from delivered orders"
        )

    # Verify the product was in that order
    item = db.query(OrderItem).filter(
        OrderItem.order_id == payload.order_id,
        OrderItem.product_id == payload.product_id,
    ).first()

    if not item:
        raise HTTPException(status_code=403, detail="Product was not in this order")

    # Check not already reviewed — hard block
    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.product_id == payload.product_id,
        Review.order_id == payload.order_id,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this product")

    review = Review(
        product_id=payload.product_id,
        user_id=current_user.id,
        order_id=payload.order_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    _hydrate_review_metadata(review, db)
    logger.info(f"Review created by {current_user.email} for product {payload.product_id}")
    return review


@router.get("/product/{product_id}", response_model=list[ReviewResponse])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(
        Review.product_id == product_id,
        Review.is_visible == True,
    ).order_by(Review.created_at.desc()).all()

    for r in reviews:
        _hydrate_review_metadata(r, db)

    return reviews


@router.get("/my", response_model=list[ReviewResponse])
def get_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all reviews the current user has written.
    Used by the account page to pre-populate which items are already reviewed."""
    reviews = db.query(Review).filter(
        Review.user_id == current_user.id,
    ).all()

    for r in reviews:
        _hydrate_review_metadata(r, db)

    return reviews


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes a specific review entry. Only the author of the review can delete it."""
    review = db.query(Review).filter(Review.id == review_id).first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Review not found"
        )

    # Security verification: block unauthorized deletions
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this review"
        )

    db.delete(review)
    db.commit()
    
    logger.info(f"Review {review_id} successfully deleted by user {current_user.email}")
    return None