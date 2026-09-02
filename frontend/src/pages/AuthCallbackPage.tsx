import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setToken } = useAuth()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      setToken(token).then(() => navigate('/', { replace: true }))
    } else {
      navigate('/login', { replace: true })
    }
  }, [params, setToken, navigate])

  return <div className="page-state">Signing you in…</div>
}
