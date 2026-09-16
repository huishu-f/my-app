/**
 * auth 模块（英文）— 键结构由 zh/auth.ts 的 Messages 类型约束
 */
import type { Messages } from '../zh/auth';

const auth: Messages = {
  loginTitle: 'Welcome back',
  loginSubtitle: 'Sign in to write, comment & engage.',
  registerTitle: 'Create an account',
  registerSubtitle: 'Sign up to start writing.',
  redirectNotice: 'Sign in to continue.',
  firstName: 'First name',
  lastName: 'Last name',
  username: 'Username',
  usernameHint: 'Letters, numbers, underscores · 3–30 chars',
  email: 'Email',
  password: 'Password',
  pwdPlaceholder: 'Enter password',
  pwdPlaceholderMin: 'Min 6 characters',
  loginSubmit: 'Sign in',
  registerSubmit: 'Sign up',
  forgotPwd: 'Forgot password? Contact admin',
  rateLimit: '5 attempts per 5 minutes',
  noAccount: 'No account?',
  registerNow: 'Sign up →',
  hasAccount: 'Have an account?',
  loginNow: 'Sign in →',
  loginSuccess: 'Signed in',
  registerSuccess: 'Account created — sign in',
  invalidEmail: 'Invalid email',
  emptyPwd: 'Password required',
  emailOrPwdError: 'Incorrect email or password',
  accountDisabled: 'Account disabled',
  loginFailed: 'Sign in failed',
  duplicateAccount: 'Email or username taken',
  registerFailed: 'Sign up failed — try again',
  errNameLength: '1–50 characters',
  errUsername: 'Letters, numbers, underscores · 3–30 chars',
  errPassword: 'At least 6 characters',
  strengthWeak: 'Weak',
  strengthMedium: 'Medium',
  strengthStrong: 'Strong',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
};

export default auth;
