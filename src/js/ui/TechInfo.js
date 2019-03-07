export default class TechInfo {
  static isMobile = !!(("ontouchstart" in window) || window.navigator && window.navigator.msPointerEnabled && window.MSGesture || window.DocumentTouch && document instanceof DocumentTouch);
  static makeSearchLink(query, qf, text) {
    const href = `https://${TechInfo.isMobile ? 'mobile.' : ''}twitter.com/search?f=${TechInfo.isMobile ? 'live' : 'tweets'}&src=typd&vertical=default&lang=en&q=${encodeURIComponent(query)}&qf=${qf ? 'on' : 'off'}`;
    return `<a href="${href}">${text || query}</a>`;
  }

  static updateSearch(results) {
    document.querySelector('#searchFAQ').classList.remove('hide');
    const contentElement = document.querySelector('#searchFAQ .techContent');
    const searchLink = TechInfo.makeSearchLink(`from:@${results.canonicalName}`);
    contentElement.innerHTML = `ما با جست‌وجوی ${searchLink}، یک توییت ${results.hasSearchBan ? 'نیافتیم.' : 'یافتیم.'}`;
  }

  static updateThread(results) {
    document.querySelector('#threadFAQ').classList.remove('hide');
    const contentElement = document.querySelector('#threadFAQ .techContent');
    if (results.thread.isBanned === undefined || !results.thread.tweet || !results.thread.reply) {
      return;
    }
    contentElement.innerHTML = `ما حداقل <a href="https://twitter.com/${results.canonicalName}/status/${results.thread.tweet}"> یک توییت با پاسخ </a> در شناسه کاربر یافتیم. یک <a href="https://twitter.com/_/status/${results.thread.reply}">پاسخ </a> جدا ${results.thread.isBanned ? 'شده' : 'نشده '} است.`;
  }

  static updateQFD(results) {
    document.querySelector('#qfdFAQ .techInfo').classList.remove('hide');
    const contentElement = document.querySelector('#qfdFAQ .techContent');
    if (results.QFD.isBanned !== undefined) {
      const searchForLink = TechInfo.makeSearchLink(`from:@${results.canonicalName} filter:${results.QFD.method}s`);
      const qfOffLink = TechInfo.makeSearchLink(results.QFD.query, false, 'غیرفعال');
      const qfOnLink = TechInfo.makeSearchLink(results.QFD.query, true, 'فعال');
      contentElement.innerHTML = `ما <a href="https://twitter.com/${results.canonicalName}/status/${results.QFD.tweetId}">این توییت مرجع</a> را با جستجوی ${searchForLink} و استخراج لینک کوتاه <a href="${results.QFD.query}">${results.QFD.query}</a> از این توییت یافتیم. توییت را با گزینه فیلتر کیفیت ${qfOffLink}  یافتیم  و با گزینه فیلتر کیفیت ${qfOnLink} ${results.QFD.isBanned ? 'نیافتیم' : 'هم یافتیم'}.`;
        if (results.QFD.login) {
          contentElement.innerHTML += `ما بدون ورود به شناسه توییتر، نتوانستیم توییت مرجع را بیابیم.`;
        }
    }
  }

  static reset() {
    document.querySelectorAll('#searchFAQ, #threadFAQ, #qfdFAQ .techInfo')
      .forEach(element => element.classList.add('hide'));
  }
}

window.TechInfo = TechInfo;
