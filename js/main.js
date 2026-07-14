// nav toggle
const tog = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (tog && links) {
  tog.addEventListener('click', () => {
    links.classList.toggle('open');
    tog.textContent = links.classList.contains('open') ? 'close' : 'menu';
  });
}

// scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// lightbox for figures
const lb = document.createElement('div');
lb.className = 'lightbox';
lb.innerHTML = '<img alt="">';
document.body.appendChild(lb);
const lbImg = lb.querySelector('img');
document.querySelectorAll('figure.fig .fig-img img').forEach(img => {
  img.parentElement.addEventListener('click', () => {
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lb.classList.add('open');
  });
});
lb.addEventListener('click', () => lb.classList.remove('open'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.classList.remove('open'); });
