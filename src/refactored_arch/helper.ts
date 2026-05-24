function toRoman(n) {
  const numerals = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let num = n;
  let out = '';
  for (const [value, symbol] of numerals) {
    while (num >= value) {
      out += symbol;
      num -= value;
    }
  }
  return out || 'I';
}

const REGION_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];
const regionColor = (id: string) => REGION_COLORS[parseInt(id.replace('reg_', ''), 10) % REGION_COLORS.length];

