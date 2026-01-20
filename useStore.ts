import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface StoreState {
  user: User | null;
  token: string | null;
  cart: CartItem[];
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  logout: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  token: null,
  cart: [],
  
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  
  addToCart: (item) => set((state) => {
    const existingItem = state.cart.find(i => i.id === item.id);
    if (existingItem) {
      return {
        cart: state.cart.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      };
    }
    return { cart: [...state.cart, { ...item, quantity: 1 }] };
  }),
  
  removeFromCart: (id) => set((state) => ({
    cart: state.cart.filter(i => i.id !== id)
  })),
  
  updateQuantity: (id, quantity) => set((state) => ({
    cart: state.cart.map(i => 
      i.id === id ? { ...i, quantity } : i
    )
  })),
  
  clearCart: () => set({ cart: [] }),
  
  getCartTotal: () => {
    const state = get();
    return state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  },
  
  getCartCount: () => {
    const state = get();
    return state.cart.reduce((count, item) => count + item.quantity, 0);
  },
  
  logout: () => set({ user: null, token: null, cart: [] })
}));