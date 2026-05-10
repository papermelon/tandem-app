"use client";

import * as React from "react";

import { useHomeState } from "@/lib/home-state";
import type { LanguageCode } from "@/lib/languages";

type Dict = Record<string, string>;

const en: Dict = {
  "nav.hub": "Hub",
  "nav.inbox": "Inbox",
  "nav.tasks": "Tasks",
  "nav.health": "Health",
  "nav.more": "More",
  "nav.timeline": "Timeline",
  "nav.addUpdate": "Add update",
  "nav.meeting": "Meeting",
  "nav.careLoad": "Care load",

  "settings.title": "Settings",
  "settings.caregiver": "Caregiver",
  "settings.appMode": "App mode",
  "settings.familyMembers": "Family members",
  "settings.records": "Records and next views",
  "settings.smartAssign": "Smart Assign preferences",
  "settings.name": "Name",
  "settings.notSet": "Not set",
  "settings.edit": "Edit",
  "settings.save": "Save",
  "settings.language": "Language",
  "settings.handoverShare": "Handover / share circle",

  "splash.tapLogo": "Tap the logo to begin",
  "splash.enterUsername": "Enter your username to begin",
  "splash.welcomeBack": "Welcome back, {name}.",
  "splash.willCreate": "We'll create a new account for \"{name}\".",
  "splash.username": "Username",
  "splash.continue": "Continue",
  "splash.createAccount": "Create account",
  "splash.accountCreated": "Account created for {name}."
};

const zh: Dict = {
  "nav.hub": "主页",
  "nav.inbox": "收件箱",
  "nav.tasks": "任务",
  "nav.health": "健康",
  "nav.more": "更多",
  "nav.timeline": "时间线",
  "nav.addUpdate": "添加更新",
  "nav.meeting": "会议",
  "nav.careLoad": "照护负担",

  "settings.title": "设置",
  "settings.caregiver": "照护者",
  "settings.appMode": "应用模式",
  "settings.familyMembers": "家庭成员",
  "settings.records": "记录与下一步",
  "settings.smartAssign": "智能分配偏好",
  "settings.name": "姓名",
  "settings.notSet": "未设置",
  "settings.edit": "编辑",
  "settings.save": "保存",
  "settings.language": "语言",
  "settings.handoverShare": "交接 / 共享照护圈",

  "splash.tapLogo": "点击标志开始",
  "splash.enterUsername": "输入用户名以开始",
  "splash.welcomeBack": "欢迎回来,{name}。",
  "splash.willCreate": "我们将为 “{name}” 创建一个新账户。",
  "splash.username": "用户名",
  "splash.continue": "继续",
  "splash.createAccount": "创建账户",
  "splash.accountCreated": "已为 {name} 创建账户。"
};

const DICTS: Partial<Record<LanguageCode, Dict>> = { en, zh };

function format(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}

export function translate(
  language: LanguageCode | undefined,
  key: string,
  vars?: Record<string, string | number>
): string {
  const dict = (language && DICTS[language]) || DICTS.en!;
  const value = dict[key] ?? DICTS.en![key] ?? key;
  return format(value, vars);
}

export function useT() {
  const home = useHomeState();
  const language = (home.state.caregiver.language ?? "en") as LanguageCode;
  return React.useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language]
  );
}
