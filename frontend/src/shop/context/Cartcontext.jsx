import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)

const CART_KEY = 'Hadeel Aljazeeraa_cart'

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || [] }
  catch { return [] }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const addItem = (product, size, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id && i.size === size)
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id && i.size === size
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [...prev, {
        product_id: product.id,
        name:       product.name,
        price:      product.price,
        discount:   product.discount,
        image:      product.images?.[0]?.url || null,
        size,
        quantity,
      }]
    })
  }

  const removeItem = (product_id, size) => {
    setItems(prev => prev.filter(i => !(i.product_id === product_id && i.size === size)))
  }

  const updateQuantity = (product_id, size, quantity) => {
    if (quantity < 1) { removeItem(product_id, size); return }
    setItems(prev => prev.map(i =>
      i.product_id === product_id && i.size === size ? { ...i, quantity } : i
    ))
  }

  const clearCart = () => setItems([])

  const count    = items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = items.reduce((s, i) => {
    const price = i.discount ? i.price * (1 - i.discount / 100) : i.price
    return s + price * i.quantity
  }, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, count, subtotal }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)