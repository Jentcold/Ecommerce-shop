import client from './client'

export const getProducts  = (category) => client.get('/products/', { params: category ? { category } : {} })
export const getProduct   = (id)       => client.get(`/products/${id}`)
export const getFeatured  = ()         => client.get('/products/featured')
export const searchProducts = (q)      => client.get('/products/search', { params: { q } })
export const getCategories = ()        => client.get('/products/categories')