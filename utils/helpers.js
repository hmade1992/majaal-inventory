export function formatNumber(num) {
  return parseFloat(num).toFixed(2);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function showMessage(message, type = 'success') {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message message-${type}`;
  msgDiv.textContent = message;
  document.body.appendChild(msgDiv);

  setTimeout(() => {
    msgDiv.classList.add('show');
  }, 10);

  setTimeout(() => {
    msgDiv.classList.remove('show');
    setTimeout(() => msgDiv.remove(), 300);
  }, 3000);
}

export function isLowStock(currentQty, minQty) {
  return parseFloat(currentQty) <= parseFloat(minQty);
}

export function showLoading(show = true) {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
}
