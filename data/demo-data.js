/* Demo seed data (frontend only). Later this comes from the backend. */
window.RestoDemo = {
  settings: { restaurantName: 'RestoFlow', openingCash: 20000, openingBank: 50000, receivables: 8500, payables: 12000, gstRate: 5 },
  sales: [
    { id: 2, date: '2026-09-24', description: 'Lunch service',  channel: 'Dine-in', payment: 'UPI',  amount: 18500, platform: '', commission: 0, taxes: 0, discount: 0, deliveryCharges: 0 },
    { id: 1, date: '2026-09-24', description: 'Dinner service', channel: 'Dine-in', payment: 'Card', amount: 12450, platform: '', commission: 0, taxes: 0, discount: 0, deliveryCharges: 0 }
  ],
  expenses: [
    { id: 2, date: '2026-09-24', description: 'Vegetables & produce', category: 'Food & ingredients', amount: 4200, payment: 'Cash', vendor: '', gst: 0, recurring: 'One-time', notes: '' },
    { id: 1, date: '2026-09-24', description: 'Electricity', category: 'Utilities', amount: 1800, payment: 'Bank transfer', vendor: '', gst: 0, recurring: 'Recurring', notes: '' }
  ],
  menu: [
    { id: 1, name: 'Paneer Tikka', price: 320, foodCost: 105 },
    { id: 2, name: 'Dal Makhani',  price: 260, foodCost: 105 },
    { id: 3, name: 'Veg Biryani',  price: 460, foodCost: 105 },
    { id: 4, name: 'Paneer Shahi', price: 599, foodCost: 105 }
  ],
  inventory: [
    { id: 1, name: 'Paneer',         category: 'Dairy',      quantity: 12,  unit: 'kg', price: 320, minStock: 5,  supplier: 'Dairy Fresh Co.' },
    { id: 2, name: 'Basmati rice',   category: 'Grains',     quantity: 40,  unit: 'kg', price: 95,  minStock: 20, supplier: 'Annapurna Traders' },
    { id: 3, name: 'Cooking oil',    category: 'Oil',        quantity: 6,   unit: 'L',  price: 140, minStock: 10, supplier: 'Annapurna Traders' },
    { id: 4, name: 'Tomatoes',       category: 'Vegetables', quantity: 0,   unit: 'kg', price: 40,  minStock: 8,  supplier: 'Local mandi' },
    { id: 5, name: 'Garam masala',   category: 'Spices',     quantity: 2.5, unit: 'kg', price: 600, minStock: 1,  supplier: 'Spice House' }
  ],
  history: [
    { month: '2026-04', revenue: 42000, expenses: 28000 },
    { month: '2026-05', revenue: 46000, expenses: 30000 },
    { month: '2026-06', revenue: 44000, expenses: 29000 },
    { month: '2026-07', revenue: 51000, expenses: 32000 }
  ]
};