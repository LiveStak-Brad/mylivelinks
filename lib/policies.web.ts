export type WebPolicyId =
  | 'terms-of-service'
  | 'privacy-policy'
  | 'community-guidelines'
  | 'payments-virtual-currency'
  | 'fraud-chargeback'
  | 'creator-earnings-payout'
  | 'dispute-arbitration'
  | 'account-enforcement-termination'
  | 'aml-summary'
  | 'law-enforcement-cooperation'
  | 'transparency-enforcement-overview';

export interface WebPolicySection {
  heading: string;
  content: string;
}

export interface WebPolicy {
  id: WebPolicyId;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  meta: string;
  summary?: string;
  sections: WebPolicySection[];
}

const EFFECTIVE_DATE = 'January 1, 2026';
const LAST_UPDATED = 'January 1, 2026';
const LEGAL_ENTITY = 'MyLiveLinks LLC';
const CONTACT_EMAIL = 'brad@mylivelinks.com';

export const WEB_POLICIES: WebPolicy[] = [
  {
    id: 'terms-of-service',
    title: 'Terms of Service (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'Rules for using MyLiveLinks, including user responsibilities and prohibited conduct.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nLegal Entity: ${LEGAL_ENTITY} (United States)\nContact: ${CONTACT_EMAIL}\nBusiness Description: Social networking and live content platform for user discovery, connections, and digital engagement.`,
    sections: [
      {
        heading: 'Eligibility; Teen Accounts (13–17)',
        content:
          'You must be at least 13 years old to use the Service.\n\nUsers aged 13–17 (“Teen Accounts”) may access the Service only through an account created and supervised by a parent or legal guardian.\n\nThe supervising adult must already have a MyLiveLinks account and must affirmatively create or authorize the Teen Account.\n\nThe supervising adult is fully responsible for:\n\nthe teen’s activity on the Service,\n\ncompliance with all policies,\n\nand any purchases, charges, or payment activity associated with the Teen Account.\n\nTeen Accounts may not initiate purchases independently. We may restrict or disable features (including messaging, gifting, monetization, or live participation) on Teen Accounts at any time.\n\nWe may take enforcement action against Teen Accounts and, where appropriate, supervising adult accounts in cases of abuse, evasion, or policy violations.',
      },
      {
        heading: 'Accounts and Security',
        content:
          'You are responsible for:\n- Maintaining the confidentiality of credentials.\n- All activity on your account.\n- Providing accurate information (including age and identity-related information where required).\n\nWe may restrict features, suspend, or terminate accounts for security, safety, compliance, or legal reasons.',
      },
      {
        heading: 'User Content and Conduct',
        content:
          'You are responsible for content you post, stream, message, upload, or otherwise provide (“User Content”). You agree not to:\n- Violate laws, regulations, or third-party rights.\n- Harass, threaten, defraud, extort, or impersonate others.\n- Share others’ private information without permission (doxxing).\n- Circumvent safety, moderation, or enforcement systems.',
      },
      {
        heading: 'App Store–Critical Prohibition: Sexual Exploitation & Services (Explicit)',
        content:
          'MyLiveLinks strictly prohibits sexual exploitation and sexual services, including (by name):\n- Prostitution\n- Escort services\n- Sexual services\n- Sexual solicitation\n- “Sugaring” / companionship-for-payment\n- Any sexual acts in exchange for money, virtual currency, gifts, or benefits\n- Any attempt to facilitate sexual services via live streams, profiles, messages, comments, or gifting systems\n\nThis prohibition applies regardless of legality in any jurisdiction. Violations may result in immediate and permanent termination.',
      },
      {
        heading: 'Virtual Currency, Gifts, and Purchases',
        content:
          'MyLiveLinks may offer virtual items or currency (e.g., coins, gifts, or similar). You agree that:\n- All virtual currency purchases are final and non-refundable.\n- You may not request refunds for virtual currency.\n- Virtual currency has no cash value (unless expressly stated in a separate written payout policy for eligible creators) and is not redeemable for cash by users.\n- We may modify, suspend, or discontinue virtual items/currency at any time.',
      },
      {
        heading: 'Chargebacks / Payment Reversals (Non-Negotiable)',
        content:
          'If you initiate or cause a chargeback, dispute, or payment reversal related to the Service (including virtual currency), you agree that:\n- We may impose immediate permanent termination.\n- We may claw back fraudulently obtained currency and related benefits.\n- If fraudulently obtained currency was transferred, then:\n  - Earnings may be offset\n  - Payouts may be paused or withheld\n- Completed bank deposits are not reversed.\n- You may lose coins, diamonds, stats, entitlements, access, and account functionality.\n- Enforcement may be immediate, retroactive, and without notice.\n- There are no guaranteed appeals, reinstatement, refunds, or restoration.',
      },
      {
        heading: 'Enforcement Rights',
        content:
          'We may remove content, restrict features, suspend, or terminate accounts at our discretion to protect safety and compliance. We may cooperate with payment processors and law enforcement when required.',
      },
      {
        heading: 'Disclaimers / Limitation of Liability',
        content:
          'The Service is provided “AS IS” and “AS AVAILABLE.” To the maximum extent permitted by law, MyLiveLinks LLC disclaims warranties and limits liability for indirect, incidental, special, consequential, or punitive damages.',
      },
      {
        heading: 'Indemnification',
        content:
          'You agree to indemnify and hold harmless MyLiveLinks LLC from claims arising from your use of the Service, your User Content, or your violations of these Terms.',
      },
      {
        heading: 'Governing Law',
        content:
          'These Terms are governed by the laws of Missouri, USA, without regard to conflict-of-law principles.',
      },
      {
        heading: 'Binding Arbitration / Class Action Waiver',
        content:
          'Disputes are subject to binding arbitration and a class action waiver as described in the Dispute Resolution & Arbitration Policy (incorporated by reference).',
      },
      {
        heading: 'Changes',
        content:
          'We may update these Terms. Continued use after changes means you accept the updated Terms.',
      },
    ],
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'How we collect, use, share, and protect information.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nLegal Entity: ${LEGAL_ENTITY} (United States)\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Information We Collect',
        content:
          'We may collect:\n- Account and Profile Data: username, display name, bio, profile photo, preferences, age/age confirmation signals.\n- User Content: posts, comments, messages, media, and live content you provide.\n- Usage Data: app interactions, pages/screens viewed, feature usage, timestamps, referring URLs (web).\n- Device and Technical Data: device identifiers, IP address, user agent, OS/app version, language, network info, crash logs.\n- Approximate Location: derived from IP or device settings (if enabled).\n- Payments Data (Web): purchase status, transaction identifiers, and risk signals from third-party payment providers. We do not need to store full payment card details to operate.\n- Support/Safety Reports: reports, attachments, and communications with support.',
      },
      {
        heading: 'How We Use Information',
        content:
          'We use information to:\n- Provide and operate the Service (accounts, profiles, messaging, live features).\n- Personalize and improve the Service.\n- Detect, prevent, and respond to fraud, abuse, and safety risks.\n- Enforce policies and comply with legal obligations.\n- Process purchases and fulfill virtual currency delivery (where applicable).\n- Communicate service updates and security notices.',
      },
      {
        heading: 'How We Share Information',
        content:
          'We may share information:\n- With service providers who help operate the Service (hosting, analytics, moderation tooling, customer support).\n- With payment providers (web) and related risk/fraud systems for transaction processing and dispute handling.\n- For legal/safety reasons (responding to lawful requests, protecting rights, safety, and integrity).\n- Business transfers (merger, acquisition, asset sale).\n\nWe do not sell personal information as a standalone product.',
      },
      {
        heading: 'Cookies / Similar Technologies (Web)',
        content:
          'We may use cookies/local storage for authentication, security, and preferences. You can adjust browser controls, but some features may not work.',
      },
      {
        heading: 'Data Retention',
        content:
          'We retain information as needed to:\n- Provide the Service.\n- Comply with legal obligations and resolve disputes.\n- Enforce policies and prevent repeat abuse.\nRetention periods may vary by data type and risk.',
      },
      {
        heading: 'Security',
        content:
          'We use reasonable administrative, technical, and physical safeguards. No system is perfectly secure; you use the Service at your own risk.',
      },
      {
        heading: 'Your Choices',
        content:
          'Depending on your location and the Service features:\n- Update profile information.\n- Adjust certain privacy settings (if available).\n- Request access/deletion where legally required.\n\nWe may refuse requests that are unlawful, compromise safety, or undermine fraud prevention or enforcement.',
      },
      {
        heading: 'Children / Minors',
        content:
          'The Service is not intended for children under 13. If we learn we collected data from a child under 13, we may delete it and take enforcement actions.\n\nFor users aged 13–17, information is collected and processed in connection with a parent- or guardian-supervised account.\n\nWe may associate Teen Account data with the supervising adult account for safety, compliance, fraud prevention, and enforcement purposes.\n\nParents or legal guardians are responsible for the teen’s use of the Service and any associated activity.',
      },
      {
        heading: 'International Users',
        content:
          'We operate from the United States. If you access the Service from outside the U.S., you understand your data may be processed in the U.S. and other locations where providers operate.',
      },
      {
        heading: 'Contact',
        content: `Privacy questions: ${CONTACT_EMAIL}`,
      },
    ],
  },
  {
    id: 'community-guidelines',
    title: 'Community Guidelines (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'Standards for safe and respectful use of MyLiveLinks.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Safety and Respect',
        content:
          'Do not harass, threaten, bully, stalk, target, or intimidate others. Do not encourage others to engage in harassment. Do not use hateful or discriminatory language or conduct.',
      },
      {
        heading: 'Teen Accounts (13–17) — Supervised Use and Stricter Safety Standards',
        content:
          'Users aged 13–17 (“Teen Accounts”) may access MyLiveLinks only through an account created and supervised by a parent or legal guardian. Teen Accounts are subject to stricter safety standards and may have features restricted or disabled at any time, including messaging, gifting, monetization, or live participation.\n\nWe apply heightened monitoring and moderation to protect teens and the community. Attempts to evade teen supervision or safety controls are treated as violations.',
      },
      {
        heading: 'Zero-Tolerance: Adult-to-Teen Exploitation, Grooming, and Predatory Behavior',
        content:
          'MyLiveLinks has zero tolerance for adult-to-teen exploitation or predatory behavior, including:\n- Sexualization of minors in any form (including suggestive comments, requests, or “roleplay” involving minors)\n- Grooming behavior, manipulation, coercion, or pressure for sexual content or sexual contact\n- Requests for private contact or off-platform escalation that targets or exploits minors\n- Any attempt to obtain sexual images, sexual content, or sexual favors from a minor\n\nAny such behavior may result in immediate permanent termination and related enforcement actions. Where a Teen Account is involved, enforcement may also apply to the linked supervising adult account where appropriate for abuse, evasion, or misuse.',
      },
      {
        heading: 'Privacy and Exploitation',
        content:
          'Do not dox, blackmail, extort, or share private information or private content without permission. Do not share someone’s identifying information, location, or private media. Do not exploit vulnerable individuals.',
      },
      {
        heading: 'Illegal Activity and Harm',
        content:
          'Do not use the platform to facilitate illegal activity or harm, including instructions for wrongdoing, credible threats of violence, or content that promotes self-harm.',
      },
      {
        heading: 'Sexual Exploitation & Services (Explicit, Non-Negotiable)',
        content:
          'MyLiveLinks explicitly prohibits sexual exploitation and sexual services, including:\n- Prostitution\n- Escort services\n- Sexual services\n- Sexual solicitation\n- “Sugaring” / companionship-for-payment\n- Sexual acts in exchange for money, virtual currency, gifts, or benefits\n- Facilitating sexual services through live streams, profiles, messages, comments, or gifting systems\n\nThis ban applies regardless of legality in any jurisdiction. Attempts to evade detection (coded language, off-platform routing, “menus,” “rates,” “booking,” or “meetups”) are treated as violations.',
      },
      {
        heading: 'Spam, Scams, and Fraud',
        content:
          'No scams, phishing, impersonation for deception, fake giveaways, or deceptive monetization. No manipulation of virtual currency or engagement systems. No attempts to bypass safety checks or enforcement.',
      },
      {
        heading: 'Authenticity',
        content:
          'No impersonation of individuals, brands, or officials. Don’t misrepresent identity for deception or fraud.',
      },
      {
        heading: 'Intellectual Property',
        content: 'Only post content you have the right to share.',
      },
      {
        heading: 'Enforcement',
        content:
          'We may remove content and restrict accounts for policy violations or risk. Enforcement may be immediate, retroactive, and without notice. No guaranteed appeals or reinstatement.',
      },
    ],
  },
  {
    id: 'payments-virtual-currency',
    title: 'Payments & Virtual Currency Policy (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'Payments and virtual currency rules, including final-sale policy and teen payment restrictions.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Virtual Currency and Digital Items',
        content:
          'MyLiveLinks may offer virtual currency and digital items (e.g., coins, gifts, or similar). These are licensed digital items, not property.',
      },
      {
        heading: 'Final Sale / No Refunds (Non-Negotiable)',
        content:
          'Virtual currency purchases are final and non-refundable.\nUsers may not request refunds for virtual currency.\nWe may deny or contest refund requests to the maximum extent permitted.',
      },
      {
        heading: 'Mobile Purchases (iOS + Android)',
        content:
          'For mobile apps:\nPurchases are processed via in-app purchases (IAP) through the applicable app store.\nYou are responsible for compliance with app store purchase rules, account security, and device access.\nWe do not control app store policies governing refunds, but our position remains: purchases are final and non-refundable.',
      },
      {
        heading: 'Web Purchases',
        content:
          'For web:\nPayments are processed via third-party payment providers, including Stripe and its supported payment methods.\nTransaction approvals, risk checks, disputes, and reversals are subject to provider rules and our enforcement rights.',
      },
      {
        heading: 'Teen Accounts and Payments',
        content:
          'Teen Accounts (ages 13–17) are not permitted to initiate purchases independently.\n\nAny purchases or payment activity associated with a Teen Account must be authorized and controlled by the supervising adult account.\n\nThe supervising adult assumes full responsibility for all charges and payment activity associated with the Teen Account.',
      },
      {
        heading: 'Fraud, Abuse, and Reversals',
        content:
          'We may:\n- Suspend delivery, reverse access, or claw back virtual currency obtained by fraud or abuse.\n- Limit purchasing, gifting, or withdrawals where we detect risk.',
      },
    ],
  },
  {
    id: 'fraud-chargeback',
    title: 'Fraud & Chargeback Policy (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'Strict rules for fraud, disputes, reversals, and related enforcement consequences.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Definitions',
        content:
          'Chargeback/Dispute: a reversal request through a bank, card network, app store, or payment provider.\nFraud: unauthorized payment use, account takeover, collusion, deception, abuse of promotions, or manipulation of virtual currency/earnings systems.\nTeen Account: an account used by a user aged 13–17 that must be created and supervised by a parent or legal guardian.',
      },
      {
        heading: 'Non-Refundable Purchases (Non-Negotiable)',
        content:
          'Virtual currency purchases are final and non-refundable. Users may not request refunds for virtual currency.',
      },
      {
        heading: 'Chargebacks and Disputes (Non-Negotiable Consequences)',
        content:
          'Any chargeback, dispute, or payment reversal may result in:\n- Immediate permanent termination\n- Loss of coins, diamonds, stats, entitlements, and access\n- Retroactive enforcement without notice\n- No guaranteed appeals, reinstatement, refunds, or restoration',
      },
      {
        heading: 'Clawbacks and Transfers (Non-Negotiable)',
        content:
          'If fraudulently obtained currency was transferred or used:\n- Fraudulent currency may be clawed back\n- Creator earnings may be offset\n- Payouts may be paused or withheld\n- Completed bank deposits are not reversed',
      },
      {
        heading: 'Teen Accounts and Supervising Adult Enforcement (Non-Negotiable)',
        content:
          'Teen Accounts (ages 13–17) may not initiate purchases independently. Any purchases or payment activity associated with a Teen Account must be authorized and controlled by the supervising adult account.\n\nIf fraud, chargebacks, disputes, reversals, or abuse occurs through or in connection with a Teen Account, we may take enforcement action against the Teen Account and against the linked supervising adult account, including immediate permanent termination and associated clawbacks, offsets, and withholds.',
      },
      {
        heading: 'Cooperation',
        content:
          'We may cooperate with payment processors and law enforcement when required, including providing relevant records where lawfully requested.',
      },
    ],
  },
  {
    id: 'creator-earnings-payout',
    title: 'Creator Earnings & Payout Policy (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'Creator payout eligibility, holds, and enforcement related to fraud and disputes.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Eligibility',
        content:
          'We may require verification, age checks, tax-related information, and compliance checks. Eligibility may be restricted by geography, risk, or policy enforcement.',
      },
      {
        heading: 'Teen Accounts Cannot Monetize (Non-Negotiable)',
        content:
          'Teen Accounts (ages 13–17) are not eligible to monetize on MyLiveLinks and may not:\n- Receive payouts\n- Access or participate in creator payout features\n- Receive creator earnings distributions intended for monetized accounts\n\nWe may restrict or disable monetization-related features on Teen Accounts at any time. Attempts to evade these restrictions (including routing monetization activity through Teen Accounts or using Teen Accounts to facilitate monetization abuse) may result in enforcement actions against the Teen Account and, where appropriate, the linked supervising adult account.',
      },
      {
        heading: 'Earnings, Holds, and Adjustments',
        content:
          'We may apply:\n- Processing, platform, and risk holds\n- Adjustments for fraud, disputes, policy violations, or chargebacks\n- Delays for compliance, safety, or integrity investigations',
      },
      {
        heading: 'Fraud / Chargeback Effects (Non-Negotiable)',
        content:
          'If fraudulently obtained currency is used to generate earnings:\n- Earnings may be offset\n- Payouts may be paused or withheld\n- Completed bank deposits are not reversed\n- Accounts may be permanently banned and lose access, entitlements, and stats',
      },
      {
        heading: 'No Guarantee of Payout',
        content:
          'Payout access is not guaranteed. We may restrict or terminate payout eligibility at any time to protect the platform and comply with law.',
      },
      {
        heading: 'Taxes',
        content: 'Creators are responsible for taxes and reporting obligations.',
      },
    ],
  },
  {
    id: 'dispute-arbitration',
    title: 'Dispute Resolution & Arbitration (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'Dispute resolution requirements, including binding arbitration and class action waiver.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nGoverning Law: Missouri, USA\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Informal Resolution',
        content:
          `Before filing a formal claim, you agree to contact us at ${CONTACT_EMAIL} with a description of the issue and your account identifier (if applicable). We may attempt to resolve.`,
      },
      {
        heading: 'Binding Arbitration (Locked)',
        content:
          'Except where prohibited by law, you agree that disputes arising out of or related to the Service or these policies will be resolved by binding arbitration.',
      },
      {
        heading: 'Supervising Adult Agreement for Teen Accounts (13–17)',
        content:
          'If you are the parent or legal guardian supervising a Teen Account (ages 13–17), you agree to these dispute resolution terms on behalf of yourself and the Teen Account, and you represent that you have the authority to do so. Disputes involving Teen Accounts are subject to binding arbitration and the class action waiver to the maximum extent permitted by law.',
      },
      {
        heading: 'Class Action Waiver (Locked)',
        content:
          'You agree to resolve disputes on an individual basis. Class actions, class arbitration, private attorney general actions, and consolidated proceedings are waived to the maximum extent permitted by law.',
      },
      {
        heading: 'Carve-Outs',
        content:
          'Either party may seek:\n- Relief in small claims court (if eligible), and/or\n- Injunctive or equitable relief to protect rights, prevent misuse, or address safety and security threats.',
      },
      {
        heading: 'Governing Law',
        content:
          'Missouri law applies (without conflict-of-law rules), and arbitration will apply that law where applicable.',
      },
    ],
  },
  {
    id: 'account-enforcement-termination',
    title: 'Account Enforcement & Termination Policy (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'How we enforce rules and terminate accounts; includes strict no-appeals posture and teen-linked enforcement.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Enforcement Authority (Maximal)',
        content:
          'We may, at any time and in our discretion:\n- Remove or limit content visibility\n- Restrict features (messaging, posting, streaming, gifting, purchasing)\n- Suspend accounts\n- Permanently terminate accounts\n- Deny access to payouts and monetization features\n- Preserve records as necessary for compliance and legal obligations\n\nEnforcement may be immediate, retroactive, and without notice.',
      },
      {
        heading: 'Teen Accounts (13–17) Enforcement',
        content:
          'Enforcement actions may apply to Teen Accounts and, where appropriate, to linked supervising adult accounts in cases of abuse, evasion, or misuse of the Service.',
      },
      {
        heading: 'No Guaranteed Appeals (Non-Negotiable)',
        content:
          'We do not guarantee:\n- Appeals\n- Reinstatement\n- Refunds\n- Restoration of coins, diamonds, stats, entitlements, or access',
      },
      {
        heading: 'Payment Integrity Enforcement (Non-Negotiable)',
        content:
          'Chargebacks, disputes, and reversals may result in immediate permanent termination and related clawbacks, offsets, and withholds as described in the Fraud & Chargeback Policy.',
      },
      {
        heading: 'Cooperation',
        content:
          'We may cooperate with payment processors and law enforcement when required.',
      },
    ],
  },
  {
    id: 'aml-summary',
    title: '(Recommended) Anti-Money Laundering (AML) Summary (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'Summary of AML-oriented risk controls for monetization features.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Summary',
        content:
          'This summary describes risk controls to prevent misuse of monetization features.\n\n- We may monitor activity for fraud and abuse patterns.\n- We may restrict purchasing, gifting, transfers, or payouts where risk is detected.\n- We may require identity verification and compliance checks for payout eligibility.\n- We may delay or withhold payouts during investigations.\n- We may comply with lawful requests and reporting obligations where applicable.\n\nThis is a summary and does not create user rights or obligations beyond our other policies.',
      },
    ],
  },
  {
    id: 'law-enforcement-cooperation',
    title: '(Recommended) Law Enforcement Cooperation Statement (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'How we respond to lawful requests and preserve records.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Statement',
        content:
          'MyLiveLinks may cooperate with law enforcement and legal processes when required.\n- We respond to valid legal requests consistent with applicable law.\n- We may preserve records as required.\n- We may disclose information to protect safety, prevent harm, address fraud, or comply with legal obligations.',
      },
    ],
  },
  {
    id: 'transparency-enforcement-overview',
    title: '(Recommended) Transparency & Enforcement Overview (MyLiveLinks)',
    effectiveDate: EFFECTIVE_DATE,
    lastUpdated: LAST_UPDATED,
    summary: 'High-level overview of enforcement and reporting posture.',
    meta: `Effective Date: ${EFFECTIVE_DATE}\nLast Updated: ${LAST_UPDATED}\nContact: ${CONTACT_EMAIL}`,
    sections: [
      {
        heading: 'Overview',
        content:
          'MyLiveLinks enforces rules to protect users and maintain compliance.\n- We may remove content and restrict accounts for policy violations or risk.\n- Enforcement may be automated, manual, or a combination.\n- We prioritize safety, fraud prevention, and payment integrity.\n- We may take immediate action without notice and may apply enforcement retroactively.\n\nNo part of this overview limits our enforcement discretion under the Terms or other policies.',
      },
    ],
  },
];

export function getWebPolicyById(id: string): WebPolicy | null {
  return WEB_POLICIES.find((p) => p.id === id) ?? null;
}

export const WEB_POLICY_FOOTER_LINKS: ReadonlyArray<WebPolicyId> = [
  'terms-of-service',
  'privacy-policy',
  'community-guidelines',
  'payments-virtual-currency',
  'fraud-chargeback',
  'creator-earnings-payout',
];
