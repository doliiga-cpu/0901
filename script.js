const body = document.body;
const themeButton = document.querySelector('.icon-button');
const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');
const savedTheme = localStorage.getItem('sidenote-theme');
if (savedTheme === 'dark') body.classList.add('dark');
function updateThemeButton(){if(!themeButton)return;const isDark=body.classList.contains('dark');themeButton.textContent=isDark?'☀':'☾';themeButton.setAttribute('aria-label',isDark?'라이트 모드로 전환':'다크 모드로 전환');}
updateThemeButton();
themeButton?.addEventListener('click',()=>{body.classList.toggle('dark');localStorage.setItem('sidenote-theme',body.classList.contains('dark')?'dark':'light');updateThemeButton();});
menuButton?.addEventListener('click',()=>{const isOpen=navLinks?.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(Boolean(isOpen)));menuButton.textContent=isOpen?'×':'☰';});
navLinks?.querySelectorAll('a').forEach((link)=>link.addEventListener('click',()=>{navLinks.classList.remove('open');menuButton?.setAttribute('aria-expanded','false');if(menuButton)menuButton.textContent='☰';}));
document.querySelectorAll('[data-category-filter]').forEach((button)=>button.addEventListener('click',()=>{document.querySelectorAll('[data-category-filter]').forEach((item)=>item.classList.remove('active'));button.classList.add('active');const filter=button.dataset.categoryFilter;document.querySelectorAll('[data-post-category]').forEach((card)=>card.classList.toggle('hidden',filter!=='all'&&card.dataset.postCategory!==filter));}));
const observer='IntersectionObserver' in window?new IntersectionObserver((entries)=>entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08}):null;
document.querySelectorAll('.reveal').forEach((element)=>observer?observer.observe(element):element.classList.add('visible'));
document.querySelectorAll('[data-demo-form]').forEach((form)=>form.addEventListener('submit',(event)=>{event.preventDefault();const message=form.querySelector('.form-message');if(message)message.textContent=form.dataset.successMessage||'정상적으로 처리되었습니다.';}));
document.querySelectorAll('[data-draft]').forEach((button)=>button.addEventListener('click',()=>{const message=document.querySelector('.form-message');if(message)message.textContent='임시 저장되었습니다.';}));
const year=document.querySelector('#year');if(year)year.textContent=new Date().getFullYear();
