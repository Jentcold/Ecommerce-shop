import client from './client'

export const getSettings = () => client.get('/admin/settings/')