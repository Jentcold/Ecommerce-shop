import client from './client'

export const getProducts    = (params)     => client.get('/products/', { params: params || {} })
export const getProduct     = (id)         => client.get(`/products/${id}`)
export const getFeatured    = (params)     => client.get('/products/featured', { params: params || {} })
export const getOnSale      = (params)     => client.get('/products/on-sale', { params: params || {} })
export const searchProducts = (q, params)  => client.get('/products/search', { params: { q, ...(params || {}) } })
export const getSections    = ()           => client.get('/products/sections')
export const getCategories  = (section)    => client.get('/products/categories', { params: section ? { section } : {} })