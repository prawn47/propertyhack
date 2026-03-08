'use strict';

function calculate(inputs) {
  const { propertyPrice, deposit, loanTermYears, interestRate, repaymentType, frequency } = inputs;

  const loanAmount = propertyPrice - deposit;
  const lvr = (loanAmount / propertyPrice) * 100;
  const lmiWarning = lvr > 80;

  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = loanTermYears * 12;

  let monthlyPaymentCents;

  if (repaymentType === 'IO') {
    monthlyPaymentCents = Math.round(loanAmount * monthlyRate);
  } else {
    if (monthlyRate === 0) {
      monthlyPaymentCents = Math.round(loanAmount / totalMonths);
    } else {
      const factor = Math.pow(1 + monthlyRate, totalMonths);
      monthlyPaymentCents = Math.round(loanAmount * (monthlyRate * factor) / (factor - 1));
    }
  }

  let repaymentAmount;
  if (frequency === 'weekly') {
    repaymentAmount = Math.round(monthlyPaymentCents * 12 / 52);
  } else if (frequency === 'fortnightly') {
    repaymentAmount = Math.round(monthlyPaymentCents * 12 / 26);
  } else {
    repaymentAmount = monthlyPaymentCents;
  }

  const chartData = [];
  const yearlyBreakdown = [];

  if (repaymentType === 'IO') {
    const annualInterest = Math.round(loanAmount * monthlyRate * 12);
    for (let year = 1; year <= loanTermYears; year++) {
      chartData.push({
        year,
        principalPaid: 0,
        interestPaid: annualInterest,
        balance: loanAmount,
      });
      yearlyBreakdown.push({
        year,
        payment: annualInterest,
        principal: 0,
        interest: annualInterest,
        balance: loanAmount,
      });
    }
    const totalInterest = annualInterest * loanTermYears;
    const totalRepaid = loanAmount + totalInterest;
    return {
      repaymentAmount,
      totalInterest,
      totalRepaid,
      lvr: Math.round(lvr * 100) / 100,
      lmiWarning,
      chartData,
      yearlyBreakdown,
    };
  }

  let balance = loanAmount;
  let totalInterestPaid = 0;

  for (let year = 1; year <= loanTermYears; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;

    for (let month = 1; month <= 12; month++) {
      if (balance <= 0) break;
      const interestThisMonth = Math.round(balance * monthlyRate);
      let principalThisMonth = monthlyPaymentCents - interestThisMonth;
      if (principalThisMonth > balance) {
        principalThisMonth = balance;
      }
      balance -= principalThisMonth;
      yearPrincipal += principalThisMonth;
      yearInterest += interestThisMonth;
    }

    totalInterestPaid += yearInterest;

    chartData.push({
      year,
      principalPaid: yearPrincipal,
      interestPaid: yearInterest,
      balance: Math.max(0, balance),
    });

    yearlyBreakdown.push({
      year,
      payment: yearPrincipal + yearInterest,
      principal: yearPrincipal,
      interest: yearInterest,
      balance: Math.max(0, balance),
    });
  }

  const totalRepaid = loanAmount + totalInterestPaid;

  return {
    repaymentAmount,
    totalInterest: totalInterestPaid,
    totalRepaid,
    lvr: Math.round(lvr * 100) / 100,
    lmiWarning,
    chartData,
    yearlyBreakdown,
  };
}

module.exports = { calculate };
