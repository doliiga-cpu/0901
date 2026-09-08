(function () {
  'use strict';

  const config = window.SIDE_NOTE_CONFIG || {};
  const apiUrl = String(config.apiUrl || '').trim();
  const tokenKey = 'sidenote-session-token';

  async function callAuth(action, data) {
    if (!apiUrl) {
      throw new Error('config.js에 Apps Script 웹 앱 URL을 입력해 주세요.');
    }

    const body = new URLSearchParams();
    body.set('action', action);
    body.set('payload', JSON.stringify(data || {}));

    const response = await fetch(apiUrl, {
      method: 'POST',
      body,
      redirect: 'follow'
    });
    if (!response.ok) throw new Error('인증 서버에 연결할 수 없습니다.');

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
    return result;
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.textContent = busy ? '처리 중…' : button.dataset.label;
  }

  function showMessage(form, text, isError) {
    const message = form.querySelector('.form-message');
    if (!message) return;
    message.textContent = text;
    message.classList.toggle('is-error', Boolean(isError));
  }

  const signupForm = document.querySelector('#signup-form');
  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setBusy(signupForm, true);
    showMessage(signupForm, '', false);
    const form = new FormData(signupForm);

    try {
      await callAuth('signup', {
        name: form.get('name'),
        handle: form.get('handle'),
        email: form.get('email'),
        password: form.get('password'),
        terms: form.get('terms') === 'on'
      });
      showMessage(signupForm, '회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.', false);
      signupForm.reset();
      window.setTimeout(() => { window.location.href = 'login.html'; }, 900);
    } catch (error) {
      showMessage(signupForm, error.message, true);
    } finally {
      setBusy(signupForm, false);
    }
  });

  const loginForm = document.querySelector('#login-form');
  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setBusy(loginForm, true);
    showMessage(loginForm, '', false);
    const form = new FormData(loginForm);

    try {
      const result = await callAuth('login', {
        email: form.get('email'),
        password: form.get('password'),
        remember: form.get('remember') === 'on'
      });
      const storage = form.get('remember') === 'on' ? localStorage : sessionStorage;
      localStorage.removeItem(tokenKey);
      sessionStorage.removeItem(tokenKey);
      storage.setItem(tokenKey, result.token);
      showMessage(loginForm, `${result.user.name}님, 환영합니다.`, false);
      window.setTimeout(() => { window.location.href = 'index.html'; }, 700);
    } catch (error) {
      showMessage(loginForm, error.message, true);
    } finally {
      setBusy(loginForm, false);
    }
  });

  window.sideNoteAuth = {
    getToken() {
      return sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey) || '';
    },
    async getSession() {
      const token = this.getToken();
      if (!token) return null;
      try {
        const result = await callAuth('session', { token });
        return result.user;
      } catch (error) {
        localStorage.removeItem(tokenKey);
        sessionStorage.removeItem(tokenKey);
        return null;
      }
    },
    async logout() {
      const token = this.getToken();
      localStorage.removeItem(tokenKey);
      sessionStorage.removeItem(tokenKey);
      if (token) await callAuth('logout', { token }).catch(() => {});
    }
  };

  async function syncNavigation() {
    const loginLink = document.querySelector('.nav-login');
    if (!loginLink || signupForm || loginForm) return;
    const user = await window.sideNoteAuth.getSession();
    if (!user) {
      loginLink.textContent = '로그인';
      loginLink.href = 'login.html';
      return;
    }

    document.documentElement.dataset.authenticated = 'true';
    loginLink.textContent = '로그아웃';
    loginLink.href = '#logout';
    loginLink.title = `${user.name} (@${user.handle})`;
    loginLink.addEventListener('click', async (event) => {
      event.preventDefault();
      await window.sideNoteAuth.logout();
      window.location.href = 'index.html';
    }, { once: true });
  }

  syncNavigation();
})();
