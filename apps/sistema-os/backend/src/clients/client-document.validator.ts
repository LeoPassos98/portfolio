function hasRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

export function isValidCpf(value: string): boolean {
  if (value.length !== 11 || hasRepeatedDigits(value)) {
    return false;
  }

  const firstSum = value
    .slice(0, 9)
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0);
  const firstDigit = (firstSum * 10) % 11;

  if ((firstDigit === 10 ? 0 : firstDigit) !== Number(value[9])) {
    return false;
  }

  const secondSum = value
    .slice(0, 10)
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (11 - index), 0);
  const secondDigit = (secondSum * 10) % 11;

  return (secondDigit === 10 ? 0 : secondDigit) === Number(value[10]);
}

function getCnpjCheckDigit(value: string): number {
  let multiplier = value.length - 7;
  const sum = value.split('').reduce((total, digit) => {
    const nextTotal = total + Number(digit) * multiplier;

    multiplier -= 1;
    if (multiplier === 1) {
      multiplier = 9;
    }

    return nextTotal;
  }, 0);
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  if (value.length !== 14 || hasRepeatedDigits(value)) {
    return false;
  }

  const firstDigit = getCnpjCheckDigit(value.slice(0, 12));
  const secondDigit = getCnpjCheckDigit(value.slice(0, 13));

  return firstDigit === Number(value[12]) && secondDigit === Number(value[13]);
}

export function isValidCpfCnpj(value: string): boolean {
  return isValidCpf(value) || isValidCnpj(value);
}
