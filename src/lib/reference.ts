export function generateReference(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    suffix += alphabet[idx];
  }
  return `SL-${suffix}`;
}
