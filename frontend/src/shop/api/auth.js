import client from './client'

export const login    = (email, password)              => client.post('/auth/login', { email, password })
export const register = (username, email, password)    => client.post('/auth/register', { username, email, password })
export const getMe    = ()                             => client.get('/users/me')