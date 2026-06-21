// ─── Disposable email blocklist ──────────────────────────────────────────────
// Throwaway email domains rejected at registration. To add one, just add the
// domain string to the Set below.

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamail.biz','guerrillamail.de','guerrillamailblock.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
  'spam4.me','trashmail.com','trashmail.me','trashmail.net','trashmail.at',
  'trashmail.io','trashmail.xyz','yopmail.com','yopmail.fr','cool.fr.nf',
  'jetable.fr.nf','nospam.ze.tc','nomail.xl.cx','mega.zik.dj','speed.1s.fr',
  'courriel.fr.nf','moncourrier.fr.nf','monemail.fr.nf','monmail.fr.nf',
  'tempmail.com','temp-mail.org','fakeinbox.com','mailnull.com',
  'maildrop.cc','dispostable.com','throwam.com','throwam.net',
  'spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'mytrashmail.com','inboxalias.com','tempr.email','discard.email',
  'einrot.com','fleckens.hu','teleworm.us','dayrep.com','jourrapide.com',
  'armyspy.com','cuvox.de','rhyta.com','superrito.com','gustr.com',
  'spamfree24.org','spamfree24.de','spamfree24.eu',
  'mohmal.com','spambox.us','mailexpire.com','throwaway.email',
  'getairmail.com','airmail.com','mt2015.com','mt2014.com',
  'doanart.com','thankyou2010.com','iwi.net','lol.ovpn.to',
  'filzmail.com','meltmail.com','incognitomail.com','incognitomail.net',
  'incognitomail.org','binkmail.com','bobmail.info','cheatmail.de',
  'freemail.ms','freundin.ru','hailmail.net','ieh-mail.de',
  'jetable.com','jetable.net','jetable.org','jetable.de','jetable.fr',
  'kasmail.com','klzlk.com','lovemeleaveme.com','lookugly.com',
  'mailandftp.com','mailbucket.org','mailme.lv','mailnew.com',
  'mailsiphon.com','mailzilla.com','mega-zik.de','meltmail.com',
  'mfsa.ru','migmail.net','migumail.com','moncourrier.fr.nf',
  'nwldx.com','objectmail.com','obobbo.com','oneoffmail.com',
  'pookmail.com','privacy.net','proxymail.eu','rcpt.at',
  'rtrtr.com','s0ny.net','safe-mail.net','sneakemail.com',
  'sogetthis.com','spam.la','spamavert.com','spambog.com',
  'spambox.info','spamcero.com','spamcon.org','spamcorptastic.com',
  'spamcowboy.com','spamcowboy.net','spamcowboy.org',
  'spamday.com','spamex.com','spamfree.eu','spamfree24.com',
  'spamgob.com','spamherelots.com','spamhereplease.com',
  'spamhole.com','spamify.com','spaminator.de','spamkill.info',
  'spaml.com','spaml.de','spammotel.com','spammy.host',
  'spamoff.de','spamslicer.com','spamspot.com','spamstack.net',
  'spamthis.co.uk','spamtroll.net','tempalias.com','tempinbox.co.uk',
  'tempomail.fr','temporarioemail.com.br','temporaryemail.net',
  'temporaryemail.us','temporaryforwarding.com','temporaryinbox.com',
  'thanksnospam.info','thisisnotmyrealemail.com','throwam.com',
  'tittbit.in','trashdevil.com','trashdevil.de','trashemail.de',
  'trashimail.de','trashinbox.com','trashmail.at','trashmail.com',
  'trashmail.io','trashmail.me','trashmail.net','trashmailer.com',
  'trashmail.org','trashmail.xyz','trashmaill.com','trashplate.com',
  'trbvm.com','turual.com','twinmail.de','tyldd.com',
  'uggsrock.com','uroid.com','us.af','venompen.com',
  'veryrealemail.com','vidchart.com','viditag.com','viewcastmedia.com',
  'viewcastmedia.net','viewcastmedia.org','webuser.in','wetrainbayarea.com',
  'wetrainbayarea.org','wh4f.org','whyspam.me','wickmail.net',
  'wilemail.com','willhackforfood.biz','willselfdestruct.com',
  'wuzupmail.net','xagloo.com','xemaps.com','xents.com',
  'xmaily.com','xoxy.net','yep.it','yogamaven.com','yuurok.com',
  'zehnminuten.de','zehnminutenmail.de','zippymail.info','zoemail.net',
  'zomg.info',
]);

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

module.exports = { isDisposableEmail };
