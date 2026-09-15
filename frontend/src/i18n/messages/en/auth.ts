/**
 * auth 模块（英文）— 键结构由 zh/auth.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/auth';

const auth: Messages = {
  loginTitle: 'Welcome back',
  loginSubtitle: 'Sign in to publish posts, comment and like.',
  registerTitle: 'Create an account',
  registerSubtitle: 'Sign up to publish posts, comment and engage.',
  redirectNotice: 'Please sign in to continue to the page you requested',
  firstName: 'First name',
  lastName: 'Last name',
  username: 'Username',
  usernameHint: 'Letters, numbers and underscores, 3-30 characters',
  email: 'Email',
  password: 'Password',
  pwdPlaceholder: 'Enter your password',
  pwdPlaceholderMin: 'At least 6 characters',
  loginSubmit: 'Sign in',
  registerSubmit: 'Sign up',
  forgotPwd: 'Forgot your password? Contact an administrator to reset it',
  rateLimit: 'Up to 5 attempts within 5 minutes',
  noAccount: "Don't have an account?",
  registerNow: 'Sign up →',
  hasAccount: 'Already have an account?',
  loginNow: 'Sign in →',
  loginSuccess: 'Signed in',
  registerSuccess: 'Account created, please sign in',
  invalidEmail: 'Please enter a valid email address',
  emptyPwd: 'Please enter your password',
  emailOrPwdError: 'Incorrect email or password',
  accountDisabled: 'This account has been disabled',
  loginFailed: 'Sign in failed',
  duplicateAccount: 'Email or username already registered',
  registerFailed: 'Sign up failed, please try again',
  errNameLength: '1-50 characters',
  errUsername: 'Letters, numbers and underscores only, 3-30 characters',
  errPassword: 'Password must be at least 6 characters',
  strengthWeak: 'Password strength: weak',
  strengthMedium: 'Password strength: medium',
  strengthStrong: 'Password strength: strong',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
};

export default auth;
