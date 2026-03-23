import { useState, useRef, useEffect, useCallback } from 'react'
import Head from 'next/head'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface LeadForm {
  name: string
  email: string
  phone: string
  business_type: string
  message: string
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  :root {
    --navy:       #050d1f;
    --navy-2:     #0d1b35;
    --navy-3:     #162040;
    --indigo:     #6366f1;
    --indigo-h:   #4f46e5;
    --purple:     #a78bfa;
    --white:      #ffffff;
    --off-white:  #f8f9ff;
    --gray-50:    #f8fafc;
    --gray-100:   #f1f5f9;
    --gray-200:   #e2e8f0;
    --gray-500:   #64748b;
    --gray-700:   #334155;
    --gray-900:   #0f172a;
    --green:      #10b981;
    --mw:         1120px;
    --r:          14px;
  }

  html { scroll-behavior: smooth; }

  /* ── NAV ──────────────────────────────────────────────────────────────── */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    padding: 0 24px;
    transition: background .3s, box-shadow .3s;
  }
  .lp-nav.scrolled {
    background: rgba(5,13,31,.96);
    backdrop-filter: blur(12px);
    box-shadow: 0 1px 0 rgba(255,255,255,.08);
  }
  .lp-nav-inner {
    max-width: var(--mw); margin: 0 auto;
    height: 64px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .lp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .lp-logo-icon {
    width: 34px; height: 34px; border-radius: 8px;
    background: linear-gradient(135deg, var(--indigo), var(--purple));
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  }
  .lp-logo-text { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -.2px; }
  .lp-nav-links { display: flex; align-items: center; gap: 28px; }
  .lp-nav-links a {
    font-size: 13px; font-weight: 500; color: rgba(255,255,255,.7);
    text-decoration: none; transition: color .15s;
  }
  .lp-nav-links a:hover { color: #fff; }
  .lp-nav-cta {
    padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
    background: var(--indigo); color: #fff; text-decoration: none;
    transition: background .15s;
  }
  .lp-nav-cta:hover { background: var(--indigo-h); }
  @media (max-width: 640px) { .lp-nav-links { display: none; } }

  /* ── HERO ─────────────────────────────────────────────────────────────── */
  .lp-hero {
    min-height: 100vh;
    background: radial-gradient(ellipse at 65% 40%, #1e1b4b 0%, var(--navy) 60%);
    display: flex; align-items: center;
    padding: 100px 24px 80px;
    position: relative; overflow: hidden;
  }
  .lp-hero::before {
    content: '';
    position: absolute; inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    pointer-events: none;
  }
  .lp-hero-inner {
    max-width: var(--mw); margin: 0 auto; width: 100%;
    display: grid; grid-template-columns: 1fr 440px; gap: 60px; align-items: center;
    position: relative;
    align-self: flex-start;
  }
  .lp-hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 999px;
    border: 1px solid rgba(99,102,241,.4);
    background: rgba(99,102,241,.12);
    font-size: 12px; font-weight: 600; color: var(--purple);
    letter-spacing: .4px; text-transform: uppercase;
    margin-bottom: 24px;
  }
  .lp-hero-badge span { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .lp-hero h1 {
    font-size: clamp(38px, 5vw, 60px);
    font-weight: 800; line-height: 1.1;
    color: #fff; letter-spacing: -1.5px;
    margin-bottom: 20px;
  }
  .lp-hero h1 em {
    font-style: normal;
    background: linear-gradient(135deg, var(--indigo), var(--purple));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .lp-hero-sub {
    font-size: 18px; line-height: 1.7; color: rgba(255,255,255,.65);
    max-width: 520px; margin-bottom: 36px;
  }
  .lp-hero-btns { display: flex; gap: 14px; flex-wrap: wrap; }
  .lp-btn-primary {
    padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;
    background: linear-gradient(135deg, var(--indigo) 0%, #7c3aed 100%);
    color: #fff; text-decoration: none; border: none; cursor: pointer;
    box-shadow: 0 4px 20px rgba(99,102,241,.4);
    transition: transform .15s, box-shadow .15s;
    display: inline-block;
  }
  .lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,.5); }
  .lp-btn-outline {
    padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;
    border: 1.5px solid rgba(255,255,255,.25); color: #fff;
    background: rgba(255,255,255,.06); text-decoration: none; cursor: pointer;
    backdrop-filter: blur(8px);
    transition: background .15s, border-color .15s;
    display: inline-block;
  }
  .lp-btn-outline:hover { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.4); }

  /* phone mockup */
  .lp-phone {
    width: 260px; height: 460px;
    border: 2px solid rgba(255,255,255,.15);
    border-radius: 44px;
    background: rgba(255,255,255,.04);
    backdrop-filter: blur(16px);
    padding: 16px;
    position: relative;
    margin: 0 auto;
    box-shadow: 0 40px 80px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.1);
  }
  .lp-phone::before {
    content: '';
    position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
    width: 60px; height: 5px; border-radius: 3px;
    background: rgba(255,255,255,.2);
  }
  .lp-phone-screen {
    margin-top: 22px; height: calc(100% - 22px);
    border-radius: 32px; overflow: hidden;
    background: #0d1b35;
    display: flex; flex-direction: column;
  }
  .lp-phone-header {
    background: linear-gradient(135deg, var(--indigo), #7c3aed);
    padding: 14px 16px;
    display: flex; align-items: center; gap: 10px;
  }
  .lp-phone-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(255,255,255,.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 15px;
  }
  .lp-phone-info { flex: 1; }
  .lp-phone-name { font-size: 12px; font-weight: 700; color: #fff; }
  .lp-phone-status { font-size: 10px; color: rgba(255,255,255,.7); margin-top: 1px; }
  .lp-phone-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); display: inline-block; margin-right: 4px; }
  .lp-phone-msgs { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
  .lp-pm { max-width: 85%; padding: 8px 11px; border-radius: 12px; font-size: 11px; line-height: 1.45; }
  .lp-pm-ai { background: rgba(255,255,255,.08); color: rgba(255,255,255,.85); border-bottom-left-radius: 3px; }
  .lp-pm-user { background: var(--indigo); color: #fff; align-self: flex-end; border-bottom-right-radius: 3px; }
  .lp-phone-input {
    padding: 10px 12px;
    display: flex; align-items: center; gap: 8px;
    border-top: 1px solid rgba(255,255,255,.06);
  }
  .lp-phone-input-bar {
    flex: 1; height: 30px; border-radius: 15px;
    background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  }
  .lp-phone-send {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--indigo);
    display: flex; align-items: center; justify-content: center; font-size: 11px;
  }
  .lp-phone-wrap {
    overflow: hidden;
    padding-top: 28px;
    padding-bottom: 16px;
  }
  .lp-hero-floating-badge {
    position: absolute; top: 8px; right: 8px;
    background: #fff; border-radius: 10px;
    padding: 10px 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,.2);
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; font-weight: 600; color: var(--gray-900);
    white-space: nowrap;
  }
  .lp-hero-floating-badge2 {
    position: absolute; bottom: 40px; left: 8px;
    background: var(--navy-3); border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; padding: 10px 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,.3);
    font-size: 11px; font-weight: 600; color: rgba(255,255,255,.8);
    white-space: nowrap;
  }
  @media (max-width: 900px) {
    .lp-hero-inner { grid-template-columns: 1fr; }
    .lp-phone-wrap { display: none; }
  }

  /* ── SECTIONS COMMON ──────────────────────────────────────────────────── */
  .lp-section { padding: 96px 24px; }
  .lp-section-inner { max-width: var(--mw); margin: 0 auto; }
  .lp-section-label {
    display: inline-block;
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
    color: var(--indigo); margin-bottom: 12px;
  }
  .lp-section-h2 {
    font-size: clamp(28px, 4vw, 40px); font-weight: 800;
    color: var(--gray-900); letter-spacing: -1px; line-height: 1.15;
    margin-bottom: 16px;
  }
  .lp-section-h2.white { color: #fff; }
  .lp-section-sub {
    font-size: 17px; color: var(--gray-500); line-height: 1.7;
    max-width: 560px; margin-bottom: 56px;
  }
  .lp-section-sub.white { color: rgba(255,255,255,.65); }
  .lp-centered { text-align: center; }
  .lp-centered .lp-section-sub { margin-left: auto; margin-right: auto; }

  /* ── PAIN POINTS ──────────────────────────────────────────────────────── */
  .lp-pain { background: var(--gray-50); }
  .lp-pain-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
    margin-top: 0;
  }
  .lp-pain-card {
    background: #fff; border: 1px solid var(--gray-200);
    border-radius: var(--r); padding: 28px;
    box-shadow: 0 2px 12px rgba(0,0,0,.05);
    position: relative; overflow: hidden;
  }
  .lp-pain-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #ef4444, #f97316);
  }
  .lp-pain-icon { font-size: 32px; margin-bottom: 16px; display: block; }
  .lp-pain-title { font-size: 16px; font-weight: 700; color: var(--gray-900); margin-bottom: 10px; }
  .lp-pain-text { font-size: 14px; color: var(--gray-500); line-height: 1.6; }
  @media (max-width: 768px) { .lp-pain-grid { grid-template-columns: 1fr; } }

  /* ── HOW IT WORKS ─────────────────────────────────────────────────────── */
  .lp-how { background: #fff; }
  .lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; position: relative; }
  .lp-steps::before {
    content: '';
    position: absolute; top: 28px; left: calc(16.66% + 20px); right: calc(16.66% + 20px);
    height: 2px; background: linear-gradient(90deg, var(--indigo), var(--purple));
    z-index: 0;
  }
  .lp-step { text-align: center; position: relative; z-index: 1; }
  .lp-step-num {
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, var(--indigo), #7c3aed);
    color: #fff; font-size: 20px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px;
    box-shadow: 0 4px 16px rgba(99,102,241,.4);
  }
  .lp-step-title { font-size: 17px; font-weight: 700; color: var(--gray-900); margin-bottom: 10px; }
  .lp-step-text { font-size: 14px; color: var(--gray-500); line-height: 1.65; }
  @media (max-width: 768px) {
    .lp-steps { grid-template-columns: 1fr; }
    .lp-steps::before { display: none; }
  }

  /* ── DEMO ─────────────────────────────────────────────────────────────── */
  .lp-demo { background: var(--gray-50); }
  .lp-demo-layout { display: grid; grid-template-columns: 1fr 420px; gap: 60px; align-items: start; }
  .lp-demo-text h3 { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 14px; }
  .lp-demo-text p { font-size: 15px; color: var(--gray-500); line-height: 1.7; margin-bottom: 16px; }
  .lp-demo-number {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 12px 18px; border-radius: 10px;
    background: var(--navy-2); color: #fff;
    font-size: 14px; font-weight: 600;
    margin-top: 8px;
  }
  .lp-demo-number .icon { font-size: 18px; }
  .lp-suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0; }
  .lp-suggestion {
    padding: 7px 13px; border-radius: 20px; font-size: 12px; font-weight: 500;
    border: 1px solid var(--gray-200); background: #fff; color: var(--gray-700);
    cursor: pointer; transition: all .15s;
  }
  .lp-suggestion:hover { border-color: var(--indigo); color: var(--indigo); background: #eef2ff; }

  /* chat widget */
  .demo-chat {
    border: 1px solid var(--gray-200); border-radius: 16px;
    overflow: hidden; background: #fff;
    box-shadow: 0 8px 40px rgba(0,0,0,.1);
    display: flex; flex-direction: column;
    height: 480px;
  }
  .demo-chat-header {
    background: linear-gradient(135deg, var(--navy-2), var(--navy-3));
    padding: 14px 18px;
    display: flex; align-items: center; gap: 12px;
  }
  .demo-chat-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: rgba(255,255,255,.15);
    display: flex; align-items: center; justify-content: center; font-size: 18px;
  }
  .demo-chat-name { font-size: 14px; font-weight: 700; color: #fff; }
  .demo-chat-status { font-size: 11px; color: rgba(255,255,255,.6); margin-top: 1px; }
  .demo-chat-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); display: inline-block; margin-right: 4px; }
  .demo-chat-msgs {
    flex: 1; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
    background: var(--gray-50);
  }
  .demo-msg { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .demo-msg-assistant { background: #fff; color: var(--gray-900); border: 1px solid var(--gray-200); border-bottom-left-radius: 3px; align-self: flex-start; }
  .demo-msg-user { background: var(--indigo); color: #fff; border-bottom-right-radius: 3px; align-self: flex-end; }
  .demo-typing { display: flex; gap: 4px; align-items: center; padding: 10px 14px; }
  .demo-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--gray-500); animation: bounce .8s infinite; }
  .demo-typing span:nth-child(2) { animation-delay: .15s; }
  .demo-typing span:nth-child(3) { animation-delay: .3s; }
  @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
  .demo-chat-form {
    padding: 12px; border-top: 1px solid var(--gray-200);
    display: flex; gap: 8px; background: #fff;
  }
  .demo-chat-input {
    flex: 1; padding: 10px 14px; border-radius: 22px;
    border: 1.5px solid var(--gray-200); font-size: 13px; font-family: inherit;
    outline: none; transition: border-color .15s;
  }
  .demo-chat-input:focus { border-color: var(--indigo); }
  .demo-chat-send {
    width: 38px; height: 38px; border-radius: 50%; border: none;
    background: var(--indigo); color: #fff; cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s, transform .1s; flex-shrink: 0; align-self: flex-end;
  }
  .demo-chat-send:hover:not(:disabled) { background: var(--indigo-h); transform: scale(1.06); }
  .demo-chat-send:disabled { background: #c7d2fe; cursor: not-allowed; }
  @media (max-width: 900px) { .lp-demo-layout { grid-template-columns: 1fr; } }

  /* ── PRICING ──────────────────────────────────────────────────────────── */
  .lp-pricing { background: #fff; }
  .lp-plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start; }
  .lp-plan {
    border: 1.5px solid var(--gray-200); border-radius: 20px;
    padding: 32px 28px; position: relative;
    transition: transform .2s, box-shadow .2s;
  }
  .lp-plan:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,.1); }
  .lp-plan-featured {
    border-color: var(--indigo);
    box-shadow: 0 8px 32px rgba(99,102,241,.2);
    transform: translateY(-8px);
  }
  .lp-plan-featured:hover { transform: translateY(-12px); box-shadow: 0 16px 48px rgba(99,102,241,.25); }
  .lp-plan-badge {
    position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
    padding: 4px 16px; border-radius: 999px;
    background: linear-gradient(135deg, var(--indigo), #7c3aed);
    color: #fff; font-size: 11px; font-weight: 700; letter-spacing: .5px;
    white-space: nowrap;
  }
  .lp-plan-name { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--gray-500); margin-bottom: 12px; }
  .lp-plan-price { margin-bottom: 6px; }
  .lp-plan-price-setup { font-size: 13px; color: var(--gray-500); margin-bottom: 20px; }
  .lp-plan-price-num { font-size: 42px; font-weight: 800; color: var(--gray-900); letter-spacing: -2px; }
  .lp-plan-price-period { font-size: 14px; color: var(--gray-500); margin-left: 2px; }
  .lp-plan-divider { height: 1px; background: var(--gray-100); margin: 20px 0; }
  .lp-plan-features { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
  .lp-plan-feat { display: flex; gap: 10px; font-size: 13.5px; color: var(--gray-700); align-items: flex-start; }
  .lp-plan-feat-check { color: var(--green); font-size: 15px; flex-shrink: 0; margin-top: 1px; }
  .lp-plan-cta {
    display: block; text-align: center;
    padding: 13px; border-radius: 10px; font-size: 14px; font-weight: 700;
    text-decoration: none; transition: all .15s;
  }
  .lp-plan-cta-secondary { background: var(--gray-100); color: var(--gray-900); }
  .lp-plan-cta-secondary:hover { background: var(--gray-200); }
  .lp-plan-cta-primary {
    background: linear-gradient(135deg, var(--indigo), #7c3aed);
    color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,.35);
  }
  .lp-plan-cta-primary:hover { box-shadow: 0 6px 22px rgba(99,102,241,.45); transform: translateY(-1px); }
  @media (max-width: 900px) { .lp-plans { grid-template-columns: 1fr; } .lp-plan-featured { transform: none; } }

  /* ── INDUSTRIES ───────────────────────────────────────────────────────── */
  .lp-industries { background: var(--gray-50); }
  .lp-industry-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .lp-industry-card {
    background: #fff; border: 1.5px solid var(--gray-200);
    border-radius: var(--r); padding: 24px 20px;
    text-align: center;
    transition: border-color .15s, transform .15s, box-shadow .15s;
    cursor: default;
  }
  .lp-industry-card:hover { border-color: var(--indigo); transform: translateY(-3px); box-shadow: 0 8px 24px rgba(99,102,241,.12); }
  .lp-industry-icon { font-size: 36px; display: block; margin-bottom: 10px; }
  .lp-industry-name { font-size: 13.5px; font-weight: 600; color: var(--gray-700); }
  .lp-industries-note { text-align: center; margin-top: 36px; font-size: 14px; color: var(--gray-500); }
  @media (max-width: 768px) { .lp-industry-grid { grid-template-columns: repeat(2, 1fr); } }

  /* ── FAQ ──────────────────────────────────────────────────────────────── */
  .lp-faq { background: #fff; }
  .lp-faq-list { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
  .lp-faq-item { border-bottom: 1px solid var(--gray-200); }
  .lp-faq-item:first-child { border-top: 1px solid var(--gray-200); }
  .lp-faq-q {
    width: 100%; display: flex; justify-content: space-between; align-items: center;
    padding: 20px 4px; background: none; border: none; cursor: pointer;
    font-size: 15px; font-weight: 600; color: var(--gray-900);
    text-align: left; gap: 16px;
  }
  .lp-faq-q:hover { color: var(--indigo); }
  .lp-faq-chevron { flex-shrink: 0; font-size: 18px; transition: transform .2s; color: var(--gray-500); }
  .lp-faq-chevron.open { transform: rotate(45deg); }
  .lp-faq-a { padding: 0 4px 20px; font-size: 14px; color: var(--gray-500); line-height: 1.75; }

  /* ── CONTACT ──────────────────────────────────────────────────────────── */
  .lp-contact {
    background: linear-gradient(135deg, var(--navy) 0%, #1e1b4b 100%);
    padding: 96px 24px;
  }
  .lp-contact-inner { max-width: 800px; margin: 0 auto; }
  .lp-contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .lp-contact-full { grid-column: 1 / -1; }
  .lp-contact label { display: block; font-size: 13px; font-weight: 600; color: rgba(255,255,255,.7); margin-bottom: 7px; }
  .lp-contact input, .lp-contact select, .lp-contact textarea {
    width: 100%; padding: 12px 14px;
    background: rgba(255,255,255,.07); border: 1.5px solid rgba(255,255,255,.12);
    border-radius: 10px; font-size: 14px; font-family: inherit; color: #fff;
    outline: none; transition: border-color .15s;
  }
  .lp-contact input::placeholder, .lp-contact textarea::placeholder { color: rgba(255,255,255,.3); }
  .lp-contact select option { background: var(--navy-2); color: #fff; }
  .lp-contact input:focus, .lp-contact select:focus, .lp-contact textarea:focus { border-color: var(--indigo); }
  .lp-contact textarea { resize: vertical; min-height: 110px; }
  .lp-contact-info { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 28px; }
  .lp-contact-info-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: rgba(255,255,255,.6); }
  .lp-contact-info-item strong { color: rgba(255,255,255,.9); }
  .lp-success {
    text-align: center; padding: 40px 20px;
    background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.3);
    border-radius: 14px;
  }
  .lp-success-icon { font-size: 48px; margin-bottom: 16px; }
  .lp-success h3 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 8px; }
  .lp-success p { font-size: 14px; color: rgba(255,255,255,.65); }

  /* ── FOOTER ───────────────────────────────────────────────────────────── */
  .lp-footer {
    background: var(--navy); border-top: 1px solid rgba(255,255,255,.06);
    padding: 32px 24px;
  }
  .lp-footer-inner {
    max-width: var(--mw); margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
  }
  .lp-footer-copy { font-size: 13px; color: rgba(255,255,255,.4); }
  .lp-footer-links { display: flex; gap: 24px; }
  .lp-footer-links a { font-size: 13px; color: rgba(255,255,255,.4); text-decoration: none; }
  .lp-footer-links a:hover { color: rgba(255,255,255,.7); }
`

// ── Inline Chat Demo ──────────────────────────────────────────────────────────

function InlineChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi there! 🐾 Welcome to Bright Paws Pet Grooming! I'm your virtual receptionist. How can I help you today?",
    },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [convId, setConvId] = useState<number | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const accumRef = useRef('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim()
      if (!msg || streaming) return

      setInput('')
      setShowSuggestions(false)
      setMessages((prev) => [...prev, { role: 'user', content: msg }])
      setStreaming(true)
      accumRef.current = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: 1, message: msg, conversationId: convId }),
        })

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let partial = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          partial += decoder.decode(value, { stream: true })
          const lines = partial.split('\n')
          partial = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            let parsed: { text?: string; done?: boolean; conversationId?: number; error?: string }
            try { parsed = JSON.parse(line.slice(6)) } catch { continue }

            if (parsed.text) {
              accumRef.current += parsed.text
              const snapshot = accumRef.current
              setMessages((prev) => {
                const msgs = [...prev]
                msgs[msgs.length - 1] = { role: 'assistant', content: snapshot }
                return msgs
              })
            }
            if (parsed.conversationId) setConvId(parsed.conversationId)
          }
        }
      } catch {
        setMessages((prev) => {
          const msgs = [...prev]
          msgs[msgs.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
          return msgs
        })
      } finally {
        setStreaming(false)
      }
    },
    [input, streaming, convId],
  )

  const suggestions = [
    'What services do you offer?',
    'How much does a full groom cost?',
    'What are your hours?',
    'Can I book an appointment?',
  ]

  return (
    <div className="demo-chat">
      <div className="demo-chat-header">
        <div className="demo-chat-avatar">🐾</div>
        <div>
          <div className="demo-chat-name">Bright Paws AI Receptionist</div>
          <div className="demo-chat-status">
            <span className="demo-chat-dot" />
            Online now
          </div>
        </div>
      </div>

      <div className="demo-chat-msgs">
        {messages.map((m, i) => (
          <div key={i} className={`demo-msg demo-msg-${m.role}`}>
            {m.content === '' && m.role === 'assistant' && streaming ? (
              <div className="demo-typing">
                <span /><span /><span />
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {showSuggestions && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--gray-200)', display: 'flex', flexWrap: 'wrap' as const, gap: 7 }}>
          {suggestions.map((s) => (
            <button key={s} className="lp-suggestion" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="demo-chat-form"
        onSubmit={(e) => { e.preventDefault(); send() }}
      >
        <input
          className="demo-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about services, hours, pricing…"
          disabled={streaming}
        />
        <button
          type="submit"
          className="demo-chat-send"
          disabled={streaming || !input.trim()}
        >
          ➤
        </button>
      </form>
    </div>
  )
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Will customers know it\'s AI?',
    a: "Voice quality is extremely natural — most callers don't notice a difference. We can also add a brief disclosure at the start of calls if you prefer transparency.",
  },
  {
    q: 'What if it gives wrong information?',
    a: "The AI only says what you approve. We build the knowledge base together from your exact hours, services, policies, and FAQs. You can request changes anytime and they go live within 24 hours.",
  },
  {
    q: 'How much does it cost compared to a human receptionist?',
    a: 'A part-time receptionist costs $1,500–$2,000/month. An answering service runs $300–$800/month with limited hours. Our Professional plan is $300/month with true 24/7 coverage — and it never calls in sick.',
  },
  {
    q: 'How long does setup take?',
    a: "24–48 hours from the time we receive your business information. We handle the full build — you just fill out a simple intake form and we do the rest.",
  },
  {
    q: 'Can I try it before committing?',
    a: "Yes. Book a free demo and we'll build a sample agent trained on your actual business name and services. You talk to it, test it, and decide from there.",
  },
]

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="lp-section lp-faq" id="faq">
      <div className="lp-section-inner lp-centered">
        <span className="lp-section-label">FAQ</span>
        <h2 className="lp-section-h2">Common Questions</h2>
        <div className="lp-faq-list" style={{ textAlign: 'left' }}>
          {FAQS.map((f, i) => (
            <div key={i} className="lp-faq-item">
              <button className="lp-faq-q" onClick={() => setOpen(open === i ? null : i)}>
                {f.q}
                <span className={`lp-faq-chevron${open === i ? ' open' : ''}`}>+</span>
              </button>
              {open === i && <div className="lp-faq-a">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Contact Form ──────────────────────────────────────────────────────────────

function ContactSection() {
  const [form, setForm] = useState<LeadForm>({ name: '', email: '', phone: '', business_type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function setField(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Submission failed')
      }
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="lp-contact" id="contact">
      <div className="lp-contact-inner">
        <div className="lp-centered" style={{ marginBottom: 48 }}>
          <span className="lp-section-label" style={{ color: 'var(--purple)' }}>Get Started</span>
          <h2 className="lp-section-h2 white">Ready to Stop Missing Customers?</h2>
          <p className="lp-section-sub white" style={{ margin: '0 auto' }}>
            Book a free demo and we'll build a sample AI receptionist trained on your actual business. No commitment required.
          </p>
        </div>

        {submitted ? (
          <div className="lp-success">
            <div className="lp-success-icon">🎉</div>
            <h3>You're on the list!</h3>
            <p>We'll reach out within one business day to schedule your free demo. Check your inbox for a confirmation.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="lp-contact-grid">
              <div>
                <label>Your Name *</label>
                <input name="name" value={form.name} onChange={setField} required placeholder="Jane Smith" />
              </div>
              <div>
                <label>Email Address *</label>
                <input name="email" type="email" value={form.email} onChange={setField} required placeholder="jane@yourbusiness.com" />
              </div>
              <div>
                <label>Phone Number</label>
                <input name="phone" type="tel" value={form.phone} onChange={setField} placeholder="(555) 000-0000" />
              </div>
              <div>
                <label>Business Type</label>
                <select name="business_type" value={form.business_type} onChange={setField}>
                  <option value="">Select your industry…</option>
                  <option>Dental Practice</option>
                  <option>Restaurant / Bar</option>
                  <option>Salon / Spa / Beauty</option>
                  <option>Home Services</option>
                  <option>Legal / Law Firm</option>
                  <option>Fitness / Gym</option>
                  <option>Auto Repair</option>
                  <option>Real Estate</option>
                  <option>Medical / Healthcare</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="lp-contact-full">
                <label>Message (optional)</label>
                <textarea name="message" value={form.message} onChange={setField} placeholder="Tell us a bit about your business and what you're looking for…" />
              </div>
            </div>

            {error && (
              <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>{error}</p>
            )}

            <div style={{ marginTop: 24, textAlign: 'center' as const }}>
              <button type="submit" className="lp-btn-primary" disabled={submitting} style={{ fontSize: 16, padding: '15px 40px' }}>
                {submitting ? 'Sending…' : 'Book Your Free Demo →'}
              </button>
            </div>

            <div className="lp-contact-info">
              <div className="lp-contact-info-item">📧 <span><strong>nexusforgeaisolutions@gmail.com</strong></span></div>
              <div className="lp-contact-info-item">📞 <span><strong>(404) 236-6404</strong></span></div>
              <div className="lp-contact-info-item">⚡ <span>Response within 1 business day</span></div>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

// ── Landing Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <Head>
        <title>Nexus Forge — AI Receptionist for Growing Businesses</title>
        <meta name="description" content="AI-powered receptionist that answers calls, chats with website visitors, books appointments, and captures leads 24/7." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </Head>

      {/* NAV */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <a href="/" className="lp-logo">
            <div className="lp-logo-icon">⚡</div>
            <span className="lp-logo-text">Nexus Forge</span>
          </a>
          <div className="lp-nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#demo">Live Demo</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <a href="#contact" className="lp-nav-cta">Book Free Demo</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div>
            <div className="lp-hero-badge">
              <span />
              AI Receptionist — Available 24/7
            </div>
            <h1>
              Never Miss a<br />
              <em>Customer Again</em>
            </h1>
            <p className="lp-hero-sub">
              AI-powered receptionist that answers calls, chats with website visitors, books appointments, and captures leads — 24/7, for a fraction of the cost of a human.
            </p>
            <div className="lp-hero-btns">
              <a href="#contact" className="lp-btn-primary">Book a Free Demo</a>
              <a href="#demo" className="lp-btn-outline">See It In Action ↓</a>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="lp-phone-wrap" style={{ position: 'relative' }}>
            <div className="lp-hero-floating-badge">
              ✅ &nbsp;Lead captured — <strong style={{ marginLeft: 4 }}>Sarah M.</strong>
            </div>
            <div className="lp-phone">
              <div className="lp-phone-screen">
                <div className="lp-phone-header">
                  <div className="lp-phone-avatar">🦷</div>
                  <div className="lp-phone-info">
                    <div className="lp-phone-name">Summit Dental AI</div>
                    <div className="lp-phone-status"><span className="lp-phone-dot" />Online</div>
                  </div>
                </div>
                <div className="lp-phone-msgs">
                  <div className="lp-pm lp-pm-ai">Hi! I'm the virtual receptionist for Summit Dental. How can I help you today?</div>
                  <div className="lp-pm lp-pm-user">Do you accept Delta Dental insurance?</div>
                  <div className="lp-pm lp-pm-ai">Yes, we accept Delta Dental! We also take Cigna, MetLife, and most major PPOs. 😊 Want to schedule a cleaning?</div>
                  <div className="lp-pm lp-pm-user">Yes please, Thursday morning?</div>
                  <div className="lp-pm lp-pm-ai">Perfect! I have 9 AM or 10:30 AM available Thursday. Which works for you?</div>
                </div>
                <div className="lp-phone-input">
                  <div className="lp-phone-input-bar" />
                  <div className="lp-phone-send">➤</div>
                </div>
              </div>
            </div>
            <div className="lp-hero-floating-badge2">
              📅 &nbsp;Appointment booked automatically
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="lp-section lp-pain">
        <div className="lp-section-inner lp-centered">
          <span className="lp-section-label">The Problem</span>
          <h2 className="lp-section-h2">What's Happening Right Now</h2>
          <p className="lp-section-sub">Every missed call is a missed customer. Every unanswered chat is a lost lead. It's happening while you sleep, while you're with a client, and on every holiday.</p>
          <div className="lp-pain-grid">
            {[
              { icon: '📵', title: 'Missed calls going to voicemail', text: 'Studies show 80% of callers won\'t leave a voicemail — they\'ll just call your competitor instead.' },
              { icon: '🚪', title: 'Website visitors leaving without converting', text: 'The average business website converts less than 2% of visitors. Most people leave before ever reaching out.' },
              { icon: '💸', title: 'Paying $2,000+/mo for 40 hours of coverage', text: 'A full-time receptionist costs $25–$35/hr. They need breaks, vacation, and they can only answer one call at a time.' },
            ].map((p) => (
              <div key={p.title} className="lp-pain-card">
                <span className="lp-pain-icon">{p.icon}</span>
                <div className="lp-pain-title">{p.title}</div>
                <div className="lp-pain-text">{p.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section lp-how" id="how-it-works">
        <div className="lp-section-inner lp-centered">
          <span className="lp-section-label">Process</span>
          <h2 className="lp-section-h2">How It Works</h2>
          <p className="lp-section-sub">From intake to live agent in 24–48 hours. No technical setup on your end.</p>
          <div className="lp-steps">
            {[
              { n: '1', title: 'We Learn Your Business', text: 'Fill out a simple intake form covering your hours, services, FAQs, and booking process. Takes about 15 minutes.' },
              { n: '2', title: 'We Build Your AI Agent', text: 'Your custom receptionist goes live in 24–48 hours, trained on your exact business info, voice, and policies.' },
              { n: '3', title: 'You Never Miss a Lead', text: 'Chat widget on your site + AI phone agent answers every call. Every inquiry captured, logged, and followed up automatically.' },
            ].map((s) => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-title">{s.title}</div>
                <div className="lp-step-text">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="lp-section lp-demo" id="demo">
        <div className="lp-section-inner">
          <div className="lp-demo-layout">
            <div className="lp-demo-text">
              <span className="lp-section-label">Live Demo</span>
              <h2 className="lp-section-h2" style={{ marginBottom: 16 }}>Try It Yourself</h2>
              <p>This is a live AI receptionist for a pet grooming business. Go ahead — ask about services, pricing, or try to book an appointment.</p>
              <p>It's answering in real-time using the same AI we deploy for our clients. This is exactly what your customers would experience.</p>
              <div className="lp-demo-number">
                <span className="icon">📞</span>
                <span>Want to hear the AI in action? Call now: <strong>(404) 236-6404</strong></span>
              </div>
              <div style={{ marginTop: 28 }}>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12, fontWeight: 600 }}>Try asking:</p>
                <div className="lp-suggestions">
                  {['What services do you offer?', 'How much for a large dog?', "What time do you close?", "Can I book for this Saturday?"].map((s) => (
                    <span key={s} className="lp-suggestion" style={{ cursor: 'default' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <InlineChat />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-section lp-pricing" id="pricing">
        <div className="lp-section-inner lp-centered">
          <span className="lp-section-label">Pricing</span>
          <h2 className="lp-section-h2">Simple, Transparent Pricing</h2>
          <p className="lp-section-sub">One-time setup fee + monthly subscription. No per-minute charges. No surprises.</p>
          <div className="lp-plans">
            {/* Starter */}
            <div className="lp-plan">
              <div className="lp-plan-name">Starter</div>
              <div className="lp-plan-price">
                <span className="lp-plan-price-num">$150</span>
                <span className="lp-plan-price-period">/mo</span>
              </div>
              <div className="lp-plan-price-setup">+ $500 one-time setup</div>
              <div className="lp-plan-divider" />
              <div className="lp-plan-features">
                {['Website chat widget', 'Custom AI system prompt', 'Up to 500 conversations/month', 'Monthly prompt updates', 'Email support'].map((f) => (
                  <div key={f} className="lp-plan-feat"><span className="lp-plan-feat-check">✓</span>{f}</div>
                ))}
              </div>
              <a href="#contact" className="lp-plan-cta lp-plan-cta-secondary">Get Started</a>
            </div>

            {/* Professional */}
            <div className="lp-plan lp-plan-featured">
              <div className="lp-plan-badge">⭐ Most Popular</div>
              <div className="lp-plan-name">Professional</div>
              <div className="lp-plan-price">
                <span className="lp-plan-price-num">$300</span>
                <span className="lp-plan-price-period">/mo</span>
              </div>
              <div className="lp-plan-price-setup">+ $1,200 one-time setup</div>
              <div className="lp-plan-divider" />
              <div className="lp-plan-features">
                {[
                  'Everything in Starter',
                  'AI voice agent (phone)',
                  'Dedicated phone number',
                  'Up to 1,000 conversations + 500 call minutes',
                  'Full conversation logs',
                  'Bi-weekly optimization',
                  'Priority support',
                ].map((f) => (
                  <div key={f} className="lp-plan-feat"><span className="lp-plan-feat-check">✓</span>{f}</div>
                ))}
              </div>
              <a href="#contact" className="lp-plan-cta lp-plan-cta-primary">Get Started</a>
            </div>

            {/* Premium */}
            <div className="lp-plan">
              <div className="lp-plan-name">Premium</div>
              <div className="lp-plan-price">
                <span className="lp-plan-price-num">$500</span>
                <span className="lp-plan-price-period">/mo</span>
              </div>
              <div className="lp-plan-price-setup">+ $2,000 one-time setup</div>
              <div className="lp-plan-divider" />
              <div className="lp-plan-features">
                {[
                  'Everything in Professional',
                  'Appointment booking integration',
                  'CRM integration',
                  'Custom AI voice clone',
                  'Unlimited usage',
                  'Weekly strategy call',
                  'Dedicated account manager',
                ].map((f) => (
                  <div key={f} className="lp-plan-feat"><span className="lp-plan-feat-check">✓</span>{f}</div>
                ))}
              </div>
              <a href="#contact" className="lp-plan-cta lp-plan-cta-secondary">Get Started</a>
            </div>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="lp-section lp-industries">
        <div className="lp-section-inner lp-centered">
          <span className="lp-section-label">Industries</span>
          <h2 className="lp-section-h2">Built for Every Business That Answers a Phone</h2>
          <p className="lp-section-sub">Same powerful platform, customized for your industry. Live in 24–48 hours.</p>
          <div className="lp-industry-grid">
            {[
              { icon: '🦷', name: 'Dental Practices' },
              { icon: '🍽️', name: 'Restaurants & Bars' },
              { icon: '💅', name: 'Salons & Spas' },
              { icon: '🔧', name: 'Home Services' },
              { icon: '🏠', name: 'Real Estate' },
              { icon: '⚖️', name: 'Legal Services' },
              { icon: '🏋️', name: 'Fitness Studios' },
              { icon: '🚗', name: 'Auto Repair' },
            ].map((ind) => (
              <div key={ind.name} className="lp-industry-card">
                <span className="lp-industry-icon">{ind.icon}</span>
                <div className="lp-industry-name">{ind.name}</div>
              </div>
            ))}
          </div>
          <p className="lp-industries-note">Don't see your industry? We build for any business. <a href="#contact" style={{ color: 'var(--indigo)' }}>Ask us →</a></p>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* CONTACT */}
      <ContactSection />

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="lp-logo-icon" style={{ width: 28, height: 28, fontSize: 13 }}>⚡</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>Nexus Forge LLC</span>
            <span className="lp-footer-copy" style={{ marginLeft: 8 }}>© 2026</span>
          </div>
          <div className="lp-footer-links">
            <a href="mailto:nexusforgeaisolutions@gmail.com">nexusforgeaisolutions@gmail.com</a>
            <a href="tel:+14042366404">(404) 236-6404</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/admin">Admin</a>
          </div>
        </div>
      </footer>
    </>
  )
}
