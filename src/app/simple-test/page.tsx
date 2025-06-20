export default function SimpleTestPage() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'white', color: 'black' }}>
      <h1>간단한 테스트 페이지</h1>
      <p>이 페이지가 보인다면 Next.js는 정상 작동 중입니다.</p>
      <p>현재 시간: {new Date().toLocaleString()}</p>
      <a href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>
        로그인 페이지로 이동
      </a>
    </div>
  )
} 