import React, { useEffect } from 'react'
import { Redirect } from 'react-router'
import { useSetRecoilState } from 'recoil'
import { useRecoilValue } from 'recoil'
import { isLoggedInState, userState } from '../state/authentication'
import { nearState, contractName } from '../state/near'

type Props = {}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const { wallet, account } = useRecoilValue(nearState)
  const setLoggedIn = useSetRecoilState(isLoggedInState)
  const setUserState = useSetRecoilState(userState)

  useEffect(() => {
    if (wallet) {
      if (wallet.isSignedIn() && account) {
        setLoggedIn(true)
        setUserState({ accountId: account.accountId })
      } else {
        setLoggedIn(false)
        setUserState(null)
      }
    }
  })

  return <React.Fragment>{children}</React.Fragment>
}

type SignOutLinkProps = {
  onSignOut?: () => void
}

export const SignOutLink: React.FC<SignOutLinkProps> = ({
  children,
  onSignOut,
}) => {
  const { wallet } = useRecoilValue(nearState)
  const setLoggedIn = useSetRecoilState(isLoggedInState)
  const setUserState = useSetRecoilState(userState)
  const logout = () => {
    wallet.signOut()
    // Update local state, as we don't have a callback on a wallet itself
    setLoggedIn(false)
    setUserState(null)
    onSignOut && onSignOut()
  }
  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            onClick: logout,
          })
        } else {
          return child
        }
      })}
    </>
  )
}

type SignInLinkProps = {
  onSignIn?: () => void
}

export const SignInLink: React.FC<SignInLinkProps> = ({
  children,
  onSignIn,
}) => {
  const { wallet } = useRecoilValue(nearState)
  const login = async () => {
    // TODO: Store app name in the config
    await wallet.requestSignIn(contractName, 'Crypto Kidz')
    onSignIn && onSignIn()
  }
  return (
    <React.Fragment>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            onClick: login,
          })
        } else {
          return child
        }
      })}
    </React.Fragment>
  )
}

type AuthRouteProps = {
  authFallback?: string // Route for auth redirect
}

export const AuthRoute: React.FC<AuthRouteProps> = ({
  children,
  authFallback = '/',
}) => {
  const isLoggedIn = useRecoilValue(isLoggedInState)

  if (!isLoggedIn) {
    return <Redirect to={authFallback} />
  }

  return <>{children}</>
}
