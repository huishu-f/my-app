import nav from "./zh/nav";
import common from "./zh/common";
import footer from "./zh/footer";
import meta from "./zh/meta";
import home from "./zh/home";
import posts from "./zh/posts";
import post from "./zh/post";
import auth from "./zh/auth";
import profile from "./zh/profile";
import settings from "./zh/settings";
import write from "./zh/write";
import errors from "./zh/errors";
import feedback from "./zh/feedback";

const zh = {
  nav,
  common,
  footer,
  meta,
  home,
  posts,
  post,
  auth,
  profile,
  settings,
  write,
  errors,
  feedback,
};

export type Messages = typeof zh;

export default zh;
