import client from './client'

export const getProductReviews = (productId) => client.get(`/reviews/product/${productId}`)
export const createReview      = (data)       => client.post('/reviews/', data)
export const getMyReviews      = ()           => client.get('/reviews/my')