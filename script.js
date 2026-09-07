const body = document.body;
const themeButton = document.querySelector('.theme-button');
const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');

const savedTheme = localStorage.getItem('profile-theme');
if (savedTheme === 'dark') body.classList.add('dark');
themeButton.textContent = body.classList.contains('dark') ? '☀' : '☾';

themeButton.addEventListener('click', () => {
  body.classList.toggle('dark');
  const isDark = body.classList.contains('dark');
  themeButton.textContent = isDark ? '☀' : '☾';
  localStorage.setItem('profile-theme', isDark ? 'dark' : 'light');
});

menuButton.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.textContent = isOpen ? '×' : '☰';
});

navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  navLinks.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = '☰';
}));

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('.project-card').forEach((card) => {
      card.classList.toggle('hidden', button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter);
    });
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const contactForm = document.querySelector('#contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    event.currentTarget.querySelector('.form-message').textContent = '메시지가 작성되었습니다. 실제 전송 기능은 백엔드 연결이 필요합니다.';
  });
}

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
