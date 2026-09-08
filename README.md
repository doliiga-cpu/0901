# SIDE NOTE

정적 GitHub Pages 블로그와 Google Apps Script/스프레드시트를 연결하는 프로젝트입니다.

## 회원가입·로그인 배포

연결 대상:

- Apps Script 프로젝트 ID: `1Xw_tWPcVvz8jvJXdPJWvaOQtUl2jfpeCKRqX2BQiWMvoXAszdMRrY88i`
- 스프레드시트 ID: `1A8IQ8LEZKpP4aYzW3xdRF2HQWZbr53cA7RqtOH53U3Y`

1. Apps Script 편집기에서 `backend/Code.gs` 내용을 `Code.gs`에 붙여넣습니다.
2. 프로젝트 설정에서 `appsscript.json` 표시를 켜고 `backend/appsscript.json` 내용으로 교체합니다.
3. 편집기에서 `setup` 함수를 한 번 실행하고 스프레드시트 권한을 승인합니다. `Users`, `Sessions` 시트와 `AUTH_PEPPER` Script Property가 자동 생성됩니다.
4. **배포 → 새 배포 → 웹 앱**을 선택합니다.
5. 실행 사용자는 **나**, 액세스 권한은 GitHub Pages에서 호출할 수 있도록 **모든 사용자**로 설정합니다.
6. 배포 후 받은 `/exec` URL을 `config.js`의 `apiUrl`에 입력합니다.
7. `signup.html`에서 가입 후 `login.html`에서 로그인을 시험합니다.

`AUTH_PEPPER`는 비밀번호 해시에 쓰이는 서버 비밀값입니다. 저장소나 브라우저 코드에 복사하지 마세요. 비밀번호 원문은 시트에 저장되지 않습니다.

이 방식은 개인·소규모 블로그용입니다. 결제나 민감정보를 다루는 서비스라면 Firebase Authentication 또는 Google Cloud Identity Platform 같은 전문 인증 서비스를 사용하세요.
