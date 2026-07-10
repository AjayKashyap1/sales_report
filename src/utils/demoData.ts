import { SalesRecord, AlertThreshold } from '../types';

// Helper to generate realistic random records for the last 15 months
export function generateDemoData(): SalesRecord[] {
  const records: SalesRecord[] = [];
  const portals = ['Amazon India', 'Flipkart', 'Meesho', 'MyWebsite'];
  const products = [
    { name: 'Wireless Pro Earbuds', price: 2499, qualities: ['Premium', 'Deluxe'], sizes: ['M', 'L'], colours: ['Black', 'White'], image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Fitband Pulse Smartwatch', price: 3999, qualities: ['Premium', 'Deluxe'], sizes: ['M', 'L'], colours: ['Black', 'Blue', 'Grey'], image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Premium Leather Wallet', price: 1299, qualities: ['Premium'], sizes: ['S', 'M'], colours: ['Brown', 'Black'], image: 'https://images.unsplash.com/photo-1627124765135-56c2f90a905a?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Ergonomic Office Chair', price: 8499, qualities: ['Deluxe', 'Premium'], sizes: ['L', 'XL'], colours: ['Black', 'Grey'], image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Stainless Steel HydraBottle', price: 899, qualities: ['Standard', 'Economy'], sizes: ['M', 'L'], colours: ['Silver', 'Blue', 'Red'], image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' }
  ];

  // Let's go back 15 months from current date (July 2026)
  // Current time is July 2026, let's anchor the end date to July 10, 2026.
  const currentDate = new Date(2026, 6, 10); // July is month index 6 (0-indexed)
  
  let recordId = 1;

  for (let m = 15; m >= 0; m--) {
    const targetMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - m, 1);
    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth();
    
    // Determine month seasonal multiplier (Diwali spike in October/November, New Year spike in Jan, Summer dip)
    let seasonalMultiplier = 1.0;
    if (month === 9 || month === 10) { // Oct (9), Nov (10) - Indian festive season
      seasonalMultiplier = 1.6;
    } else if (month === 11 || month === 0) { // Dec, Jan - Winter/New Year sale
      seasonalMultiplier = 1.3;
    } else if (month === 4 || month === 5) { // May, June - Summer slump
      seasonalMultiplier = 0.85;
    }

    // Generate multiple sales events per month
    const transactionCount = Math.floor(15 + Math.random() * 15); // 15-30 sales entries per month
    
    for (let i = 0; i < transactionCount; i++) {
      const day = Math.floor(Math.random() * 28) + 1; // 1 to 28
      const date = new Date(year, month, day);
      
      const portal = portals[Math.floor(Math.random() * portals.length)];
      const productObj = products[Math.floor(Math.random() * products.length)];
      
      // Units sold in this batch
      let units = Math.floor(Math.random() * 8) + 1; // 1 to 8 units
      
      // Portals have specific biases for realism
      if (portal === 'Amazon India') {
        units = Math.floor(units * 1.5 * seasonalMultiplier);
      } else if (portal === 'Flipkart') {
        units = Math.floor(units * 1.3 * seasonalMultiplier);
      } else if (portal === 'Meesho') {
        units = Math.floor(units * 1.2 * seasonalMultiplier);
      } else { // MyWebsite
        units = Math.floor(units * 0.8 * seasonalMultiplier);
      }
      
      if (units < 1) units = 1;

      // Add random minor discount/variation (up to 10% off)
      const discount = 1 - (Math.random() * 0.1);
      const amount = Math.round(productObj.price * units * discount);

      // Select randomized filters
      const quality = productObj.qualities[Math.floor(Math.random() * productObj.qualities.length)];
      const size = productObj.sizes[Math.floor(Math.random() * productObj.sizes.length)];
      const colour = productObj.colours[Math.floor(Math.random() * productObj.colours.length)];

      records.push({
        id: `sales_${year}_${month}_${recordId++}`,
        date,
        portal,
        product: productObj.name,
        amount,
        units,
        quality,
        size,
        colour,
        imageLink: productObj.image
      });
    }
  }

  // Sort by date descending
  return records.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export const initialThresholds: AlertThreshold[] = [
  {
    id: 't-1',
    targetType: 'TOTAL',
    targetName: 'All Portals',
    metric: 'UNITS',
    condition: 'LESS_THAN',
    value: 120,
    isActive: true,
    createdAt: new Date(2026, 5, 1).toISOString()
  },
  {
    id: 't-2',
    targetType: 'PORTAL',
    targetName: 'MyWebsite',
    metric: 'UNITS',
    condition: 'LESS_THAN',
    value: 30,
    isActive: true,
    createdAt: new Date(2026, 5, 1).toISOString()
  },
  {
    id: 't-3',
    targetType: 'PORTAL',
    targetName: 'Amazon India',
    metric: 'UNITS',
    condition: 'LESS_THAN',
    value: 20,
    isActive: false,
    createdAt: new Date(2026, 5, 5).toISOString()
  }
];
