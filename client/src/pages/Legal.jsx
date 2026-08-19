import React from "react";
import { Link, useLocation } from "react-router-dom";

// Terms of Use and the Privacy Notice for The Quad.
//
// These are written for The Quad specifically rather than reused from another EDUK8U
// property: The Quad is a members' network that stores profiles, CVs, direct messages and
// job applications, which is a different collection to a marketing site. Anything still to
// be confirmed by the business is marked [TBC] rather than guessed at.
//
// NOT LEGAL ADVICE. This is a working draft for compliance review before launch.

const ENTITIES = {
  my: "Marwin Innovation Sdn Bhd (Company No. 1268994-H), SO-20-07, Menara 1, 3 Jalan Bangsar, KL Eco City, 59200 Kuala Lumpur, Malaysia",
  au: "International College of Queensland Australia (ICQA), RTO No. 46584, Southport Central Building 3G, Level 4, 27 Garden Street, Southport QLD 4215, Australia",
  email: "info@eduk8u.com",
  phoneMy: "+603 2703 3228",
  phoneAu: "+61 420 457 883",
  phoneLk: "+94 11 759 8488",
  effective: "[TBC — date of publication]",
  version: "1.0 (draft for review)",
};

const TERMS = [
  ["About these terms", [
    `The Quad is a private alumni network operated jointly by ${ENTITIES.my} ("EDUK8U") and ${ENTITIES.au} ("ICQA"), together "we", "us" or "our".`,
    "By redeeming an invite code and creating an account, you agree to these Terms of Use and to the Privacy Notice on this page. If you do not agree, do not use The Quad.",
  ]],
  ["Who may use The Quad", [
    "The Quad is closed to the public. Access is by invite code issued by the alumni office to graduates and students of EDUK8U and ICQA, and to staff of those organisations.",
    "Your invite code is personal to you and works once. You must not share it, and you must not create an account on behalf of anyone else.",
    "You are responsible for keeping your password confidential and for everything done through your account. Tell us immediately if you believe someone else has access to it.",
  ]],
  ["What The Quad is, and what it is not", [
    "The Quad is a place for alumni to find each other, share opportunities and arrange mentoring. We provide the platform.",
    "We do not employ, endorse, vet or supervise members. We are not a party to any arrangement you reach with another member, including any job, engagement, purchase, sale or mentoring relationship.",
    "The Quad never handles payment. Any money that changes hands between members is entirely a matter between those members.",
  ]],
  ["Content you post", [
    "You keep ownership of what you post. By posting, you grant us a non-exclusive licence to host and display that content to other members for the purpose of running The Quad.",
    "You are responsible for what you post, and you must have the right to post it.",
    "Do not post anything unlawful, misleading, discriminatory, harassing, defamatory, or infringing someone else's rights. Do not post another person's personal information without their consent. Do not use The Quad to send unsolicited bulk marketing.",
  ]],
  ["Jobs, the marketplace and mentoring", [
    "Members post jobs and listings directly. We do not verify that a role, a listing, a price or a qualification is genuine, and we do not guarantee any outcome.",
    "When you apply for a role through The Quad, your name, headline profile details and, if you choose to attach it, your CV are shared with the member who posted that role.",
    "Satisfy yourself about any opportunity before acting on it, and take the same care you would with any approach from outside The Quad.",
  ]],
  ["Moderation and removal", [
    "Any member can report a post, comment, message, listing or job. Reports are reviewed by an administrator; content is not hidden automatically.",
    "We may remove content or suspend an account where we reasonably consider these terms have been breached. Removed content is retained so that a removal can be reviewed or reversed, and the member is notified.",
    "Administrator actions of this kind are recorded in an internal audit log.",
  ]],
  ["Availability", [
    "We aim to keep The Quad available but do not promise uninterrupted access. We may change, suspend or withdraw features, and may carry out maintenance at any time.",
  ]],
  ["Ending your access", [
    "You may stop using The Quad at any time and ask us to close your account.",
    "We may suspend or close an account that breaches these terms, or where a person is no longer eligible for the network.",
  ]],
  ["Liability", [
    "Nothing in these terms limits any right you have under the Australian Consumer Law, the Malaysian Consumer Protection Act 1999, or any other law that cannot lawfully be excluded.",
    "Beyond that, and to the extent the law allows, we are not liable for loss arising from your use of The Quad, from content posted by other members, or from any dealing you enter into with another member.",
  ]],
  ["Changes to these terms", [
    "We may update these terms. Where a change is material we will tell you in the app before it takes effect. Continuing to use The Quad after that means you accept the updated terms.",
  ]],
  ["Governing law", [
    "These terms are governed by the laws of [TBC — Malaysia or Queensland, Australia; to be confirmed with compliance], and the courts of that place have non-exclusive jurisdiction.",
  ]],
];

const PRIVACY = [
  ["Who is responsible for your information", [
    `The Quad is operated jointly by ${ENTITIES.my} and ${ENTITIES.au}. Both organisations are responsible for the personal information held in The Quad.`,
    "We handle personal information in line with Malaysia's Personal Data Protection Act 2010 and, for members and records connected with Australia, the Privacy Act 1988 (Cth) and the Australian Privacy Principles.",
    "This notice covers The Quad only. It does not replace the privacy policies on the EDUK8U or ICQA websites, or the policies covering your studies.",
  ]],
  ["What we collect", [
    "From your invite: your name, email address, the brand you studied under, your programme, graduation year and country.",
    "From your account: your password, which is stored only as a cryptographic hash and is never visible to us or to anyone else.",
    "From your profile, where you choose to provide it: job title, employer, industry, country, city, LinkedIn URL, a short biography, a profile photo and a CV.",
    "From your activity: posts, comments, likes, direct messages, connection requests, mentoring preferences and mentorship records, event RSVPs, marketplace listings, job posts, and job applications including any message you write.",
    "Automatically: a sign-in token held in your browser for up to 30 days, and standard technical records generated by our hosting providers.",
    "We do not collect health information, government identifiers, or payment details through The Quad.",
  ]],
  ["Who can see what", [
    "Your name, programme badge, job title, employer, city and country, biography and profile photo are visible to every other member of The Quad. It is a closed network, but it is not private between you and us.",
    "Your profile photo is stored at a public web address. Treat it as public.",
    "Your CV is stored privately. You control who can see it: all members, your connections only, or nobody. Attaching your CV to a job application is a separate, explicit decision that shares it with that one poster regardless of your general setting.",
    "Direct messages are visible to you and the person you are writing to. Administrators cannot read your messages through The Quad.",
    "Your email address is not shown on your profile. It is shared with a job poster when you apply for their role, and it is visible to administrators.",
  ]],
  ["Why we use it", [
    "To run The Quad: signing you in, showing you the directory, delivering posts, messages and notifications, matching mentors with mentees by industry, and passing applications to the member who posted a role.",
    "To keep it safe: reviewing reports, removing content that breaches the Terms of Use, and keeping an audit record of administrator actions.",
    "To contact you about the network and about your account.",
    "We do not sell personal information, and we do not use it for advertising.",
  ]],
  ["Who we share it with", [
    "Other members, as described under \"Who can see what\".",
    "Our hosting and infrastructure providers, who process data on our instructions: Supabase (database and file storage) and Vercel (application hosting).",
    "Where required or permitted by law.",
    "Data is stored in the region configured for our Supabase project: [TBC — confirm Supabase project region], which may be outside Malaysia and Australia. Where information is handled overseas we take reasonable steps to see that it is protected to a comparable standard.",
  ]],
  ["Email", [
    "The Quad does not currently send automated email. Invite codes and password reset codes are issued through the alumni office and passed to you directly.",
    "If we introduce automated email we will update this notice, and any marketing email will include an unsubscribe option.",
  ]],
  ["How long we keep it", [
    "We keep your account and its content while your account is open.",
    "Content removed by an administrator is retained so the decision can be reviewed or reversed. Audit records of administrator actions are kept for accountability.",
    "If your account is closed we remove your profile from the directory. A retention period for the remaining records is [TBC — to be set with compliance].",
  ]],
  ["Security", [
    "Passwords are hashed. Access to The Quad requires a sign-in token. CV downloads use short-lived links that expire after one minute. Administrator functions are restricted to administrator accounts.",
    "No online service is completely secure. Please use a strong, unique password and tell us if you suspect a problem with your account.",
  ]],
  ["Your choices and your rights", [
    "You can edit or delete most of your profile at any time, change who can see your CV, remove your CV, withdraw a job application, cancel a connection request, disconnect from a member, and recall or edit a message within 15 minutes of sending it.",
    "You may ask us for a copy of the personal information we hold about you, ask us to correct it, or ask us to close your account. Contact us using the details below.",
  ]],
  ["Complaints", [
    `If you are concerned about how we have handled your information, contact us at ${ENTITIES.email} and we will respond.`,
    "If you are not satisfied, you may complain to the Office of the Australian Information Commissioner (oaic.gov.au) or, in Malaysia, to the Personal Data Protection Department (pdp.gov.my).",
  ]],
  ["Changes to this notice", [
    "We may update this notice. Where a change is material we will tell you in the app before it takes effect.",
  ]],
  ["Contact us", [
    `Email: ${ENTITIES.email}`,
    `Malaysia: ${ENTITIES.phoneMy} — ${ENTITIES.my}`,
    `Australia: ${ENTITIES.phoneAu} — ${ENTITIES.au}`,
    `Sri Lanka: ${ENTITIES.phoneLk}`,
  ]],
];

function Doc({ title, intro, sections }) {
  return (
    <div className="legal">
      <div className="page-head">
        <h1>{title}</h1>
      </div>
      <div className="card pbox legal-meta">
        <span><b>Effective:</b> {ENTITIES.effective}</span>
        <span><b>Version:</b> {ENTITIES.version}</span>
        <span className="legal-warn">Draft for compliance review — not yet approved for launch.</span>
      </div>
      <div className="card pbox">
        <p className="legal-intro">{intro}</p>
        <ol className="legal-body">
          {sections.map(([heading, paras]) => (
            <li key={heading}>
              <h4>{heading}</h4>
              {paras.map((p, i) => <p key={i}>{p}</p>)}
            </li>
          ))}
        </ol>
      </div>
      <p className="legal-foot">
        <Link to="/terms">Terms of Use</Link> · <Link to="/privacy">Privacy Notice</Link>
      </p>
    </div>
  );
}

export default function Legal() {
  const isPrivacy = useLocation().pathname.startsWith("/privacy");
  return isPrivacy ? (
    <Doc title="Privacy Notice" sections={PRIVACY}
      intro="How The Quad collects, uses and shares your personal information, and what you can do about it." />
  ) : (
    <Doc title="Terms of Use" sections={TERMS}
      intro="The rules for using The Quad. Please read them before you post, apply or message." />
  );
}
