import { useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

export function useGoogleAccessToken() {
  const tokenClientRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let tries = 0
    const iv = setInterval(() => {
      tries++
      if (window.google?.accounts?.oauth2 && CLIENT_ID) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          prompt: '',
          callback: (resp) => {
            if (resp && resp.access_token) setToken(resp.access_token)
          }
        })
        setReady(true)
        clearInterval(iv)
      } else if (tries > 200) {
        clearInterval(iv)
        console.error('Google Identity Services failed to load.')
      }
    }, 100)
    return () => clearInterval(iv)
  }, [])

  const signIn = () => tokenClientRef.current?.requestAccessToken()
  const signOut = () => {
    if (token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
        headers: { 'Content-type': 'application/x-www-form-urlencoded' }
      }).catch(() => {})
    }
    setToken(null)
    setProfile(null)
  }

  useEffect(() => {
    if (!token) return
    fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.email) setProfile({ email: j.email }) })
      .catch(() => {})
  }, [token])

  return { ready, token, profile, signIn, signOut }
}
