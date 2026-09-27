export const demoDecision = 'Which laptop gives me the best balance of price, performance, battery life, portability and display quality?';

export const demoCriteria = [
  { id: 'price', name: 'Price', weight: 30 },
  { id: 'performance', name: 'Performance', weight: 30 },
  { id: 'battery', name: 'Battery life', weight: 20 },
  { id: 'portability', name: 'Portability', weight: 10 },
  { id: 'display', name: 'Display quality', weight: 10 }
];

export const demoOptions = [
  {
    id: 'laptop-a',
    name: 'Laptop A',
    scores: { price: 55, performance: 98, battery: 92, portability: 70, display: 95 }
  },
  {
    id: 'laptop-b',
    name: 'Laptop B',
    scores: { price: 75, performance: 80, battery: 78, portability: 82, display: 80 }
  },
  {
    id: 'laptop-c',
    name: 'Laptop C',
    scores: { price: 100, performance: 55, battery: 60, portability: 75, display: 60 }
  }
];
