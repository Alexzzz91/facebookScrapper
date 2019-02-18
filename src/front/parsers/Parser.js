class Parser extends CommonParser{
    constructor(props) {
        super(props);
        this.state = {
          allEntites: null,
          allEntitesCount: 0,
          currUrl: window.location.href,
          groupName: null,
          params: {...props},
          contacts:{}
        };
    }

    runParse(path) {
      return new Promise((resolve, reject) => {
        let allEntites;
        if (!this.state.currUrl && !!path){
          this.state.currUrl = path;
        }
        this.state.allEntitesCount = document.evaluate("normalize-space(//*[contains(@id, 'member_requests_pagelet')]//div[contains(@direction, 'left')]/div/div/span)", document, null, XPathResult.STRING_TYPE, null).stringValue;
        this.state.allEntitesCount = parseInt(this.state.allEntitesCount.replace(/\D/g,''));
        this.state.groupName = document.evaluate("normalize-space(//*[contains(@id, 'mainContainer')]//a[contains(@href, 'groups')]/text())", document, null, XPathResult.STRING_TYPE, null).stringValue;
        allEntites = this.getElementsByXPath(".//*[contains(@id, 'member_requests_pagelet')]//div/div/ul[contains(@class, 'uiList')]/li[not(@class)]/div[contains(@direction, 'left') or contains(@direction, 'right')]", document)

        const intervalId = setInterval(() => {
          window.scrollTo(0,document.body.scrollHeight);
          allEntites = this.getElementsByXPath(".//*[contains(@id, 'member_requests_pagelet')]//div/div/ul[contains(@class, 'uiList')]/li[not(@class)]/div[contains(@direction, 'left') or contains(@direction, 'right')]", document)
          if(allEntites.length === this.state.allEntitesCount) {
            clearTimeout(intervalId);
            if(!this.state.params.entities || this.state.params.entities == 'all'){
              resolve(this.getList(".//*[contains(@id, 'member_requests_pagelet')]//div/div/ul[contains(@class, 'uiList')]/li[not(@class)]/div[contains(@direction, 'left') or contains(@direction, 'right')]", document));
            }
            resolve(this.getList(".//*[contains(@id, 'member_requests_pagelet')]//div/div/ul[contains(@class, 'uiList')]/li[not(@class)]/div[contains(@direction, 'left') or contains(@direction, 'right')]/div/div/div/div[last()]/ul/li[not(i)]/ancestor::li[not(@class)]/div", document));
          };
        }, 1500)
      });
    }

  getList(xPath) {
    return new Promise((resolve, reject) => {
      let entities = this.getElementsByXPath(xPath, document);
      let result = [];
      entities.forEach((entity, idx, array) => {
        this.parseProfile({htmlString:entity.innerHTML})
          .then(record => { return result.push(record) })
          .catch(err => { return reject(err); });
      });
      resolve(result);
    });
  }

  parseProfile({ htmlString }) {
    return new Promise((resolve, reject) => {
      try {
        let record = new Record,
            dom = this.getHTMLFromString(htmlString),
            showMoreExist = false;

        const name = document.evaluate("normalize-space(//a[contains(@data-hovercard, '/ajax/hovercard/user')]/text())", dom, null, XPathResult.STRING_TYPE, null).stringValue;

        record.setName(name);

        record.setGroupName(this.state.groupName)

        // const groupId = this.state.currUrl.match(/groups\/(\w+)(\/|$)/);

        // record.setGroup(groupId[1])

        const userId = document.evaluate("normalize-space(//a[contains(@data-hovercard, '/ajax/hovercard/user')]/@uid)", dom, null, XPathResult.STRING_TYPE, null).stringValue;

        record.setUserId(userId)

        const profileUrl = document.evaluate("normalize-space(//a[contains(@data-hovercard, '/ajax/hovercard/user')]/@href)", dom, null, XPathResult.STRING_TYPE, null).stringValue;

        record.setProfileUrl('https://www.facebook.com'+profileUrl)

        // const avatarImage = document.evaluate("normalize-space(//a[contains(@data-hovercard, '/ajax/hovercard/user')]/img/@src)", dom, null, XPathResult.STRING_TYPE, null).stringValue;

        // record.setAvatarImage(avatarImage)

        const answersRaw = this.getElementsByXPath(".//body/div/div/div/div[last()]/ul/li[not(i)]", dom);

        let answers = [];

        answersRaw.forEach((i, idx, array) => {
            let answerDom = this.getHTMLFromString(i.innerHTML),
                resAnswer = new answerRecord;
            const question = document.evaluate("normalize-space(//div/text())", answerDom, null, XPathResult.STRING_TYPE, null).stringValue;
            resAnswer.setQuestion(question);
            const answer = document.evaluate("normalize-space(//text/text())", answerDom, null, XPathResult.STRING_TYPE, null).stringValue;
            resAnswer.setAnswer(answer);
            answers.push(resAnswer.toObject());
        });

        record.setAnswers(answers);

        const additionalRaw = this.getElementsByXPath(".//body/div/div/div/div/ul/li/i/..", dom);

        console.log('additionalRaw', additionalRaw);

        additionalRaw.forEach((i, idx, array) => {
            let additionalDom = this.getHTMLFromString(i.innerHTML);
            const tryTime = document.evaluate("normalize-space(//span/text())", additionalDom, null, XPathResult.STRING_TYPE, null).stringValue;

            if (!!tryTime && !!tryTime.match && tryTime.match(/20\w+($|\s)/)) {
              record.setJoinedFacebookOn(tryTime);
            }

            const city = document.evaluate("normalize-space(//span/a[contains(@href, 'facebook.com/pages/')]/text())", additionalDom, null, XPathResult.STRING_TYPE, null).stringValue;

            if (!!city) {
              record.setFrom(city);
              record.setLivesIn(city);
            }

            const work = document.evaluate("normalize-space(//span/a[not(contains(@href, 'facebook.com/pages/'))]/text())", additionalDom, null, XPathResult.STRING_TYPE, null).stringValue;

            if (!!work) {
              record.setWorksAt(work);
            }

            const studiedAt = document.evaluate("normalize-space(//span/a[not(contains(@href, 'facebook.com/pages/'))]/text())", dom, null, XPathResult.STRING_TYPE, null).stringValue;

            if (!!studiedAt) {
              record.setStudiedAt(studiedAt);
            }
        });

        resolve(record.toObject());
      } catch(err) {
        console.log(err);
        reject(err);
      }
    });
  }
}
