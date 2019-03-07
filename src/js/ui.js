import TechInfo from './ui/TechInfo';
import qfSettingToast from './ui/qfSettingToast';

export default class UI {
  constructor(test) {
    // user handle input and title synchronisation
    this.screenName = document.getElementById('screenName');
    this.screenNameLabel = document.querySelector('label[for="screenName"]');
    this.screenNamePrefix = document.querySelector('#controls .input-field .prefix');
    this.headerScreenName = document.querySelector('.header-screen_name');
    this.screenName.addEventListener('keyup', this.updateHeaderScreenName, true);

    // results
    this.results = document.querySelector('#results');

    // button, initiating test
    this.checkButton = document.getElementById('check');
    this.checkButton.addEventListener('click', this.handleCheckClick);

    // custom click handler for Materialize Collapsibles
    const handleCollapsibleClick = M.Collapsible.prototype._handleCollapsibleClick;
    M.Collapsible.prototype._handleCollapsibleClick = function _handleCollapsibleClick(evt) {
      evt.stopPropagation();
      // ignore link clicks
      if (evt.target.tagName === 'A') {
        return;
      }

      // ignore where attribute 'collapsible-non-interactive' is set
      const collapsibleNI = cash(evt.target)
        .closest('.collapsible')
        .attr('collapsible-non-interactive');
      const headerNI = cash(evt.target)
        .closest('.collapsible-header')
        .attr('collapsible-non-interactive');

      const isInteractive = collapsibleNI === null && headerNI === null;
      if (isInteractive) {
        handleCollapsibleClick.call(this, evt);
      }
    };
    // Keyboard events disabled entirely
    M.Collapsible.prototype._handleCollapsibleKeydown = () => {};

    // all other collapsibles
    this.tasksCollapsible = M.Collapsible.init(document.getElementById('tasks'));
    this.searchFaqCollapsible = M.Collapsible.init(document.getElementById('searchFAQ'));
    this.threadFaqCollapsible = M.Collapsible.init(document.getElementById('threadFAQ'));
    this.qfdFaqCollapsible = M.Collapsible.init(document.getElementById('qfdFAQ'), {
      onOpenEnd: UI.scrollToTop
    });
    this.functionalityCollapsible = M.Collapsible.init(document.getElementById('functionality'));

    // toast warning about qf option in notification settings
    if (!localStorage.getItem('qf-option-toast')) {
      this.qfSettingToastInstance = qfSettingToast(() => this.qfSettingToastDimsmiss(true));
    }

    // actual test function
    this.test = test;
    const donateModalElement = document.getElementById('donate-modal');
    M.Modal.init(donateModalElement);
  }

  runTest() {
    this.checkButton.focus(); // remove focus from input field, to close mobile screen kbd
    this.reset(this.screenName);
    this.setLocationForScreenName();
    this.lock();
    this.test(this.screenName.value)
      .then(this.release)
      .catch(this.release);
  }

  // user handle input, title sync
  updateHeaderScreenName = (evt) => {
    evt.stopPropagation();
    if (evt.which === 13) {
      return this.handleCheckClick(evt);
    }
    const classes = this.screenNamePrefix.classList;
    if (!this.screenName.value) {
      classes.remove('invalid');
      classes.remove('valid');
      this.headerScreenName.innerText = '@username';
      return false;
    }

    this.screenName.value = this.screenName.value.replace('@', '').trim();

    if (!this.screenName.validity.patternMismatch) {
      classes.remove('invalid');
      classes.add('valid');
    } else {
      classes.remove('valid');
      classes.add('invalid');
    }
    this.headerScreenName.innerText = `@${this.screenName.value}`;
    return false;
  };

  // click handler for test initiator button
  handleCheckClick = (evt) => {
    evt.stopPropagation();
    if (this.checkButton.disabled) {
      return;
    }

    if (this.screenName.validity.valid) {
      this.runTest();
    } else {
      const toolTip = M.Tooltip.init(this.screenName);
      toolTip.isHovered = true;
      toolTip.open();
      window.setTimeout(() => {
        toolTip.close();
        toolTip.destroy();
      }, 5000);
    }
  };

  unhandledError = () => {
    const incompleteTasks = Array.from(document.querySelectorAll(
      '[data-task-status="pending"],[data-task-status="running"]'
    ));
    window._tsk = incompleteTasks;
    const taskUpdates = incompleteTasks.map(x => ({
      id: x.dataset.taskId,
      status: 'warn',
      msg: 'خطایی در سرور رخ داد، لطف بعدا تلاش کنید'
    }));
    this.updateTask(...taskUpdates);
  };

  // update task info; takes one or more objects
  updateTask = (...tasks) => {
    tasks.forEach((task) => {
      const taskEls = Array.isArray(task.id) ? task.id : [task.id];
      for (let i = 0; i < taskEls.length; i += 1) {
        const taskEl = this.results.querySelector(`[data-task-id="${taskEls[i]}"]`);
        const taskIcon = taskEl.querySelector('.material-icons');
        const taskIconClasses = taskIcon.classList;
        // icon
        switch (task.status) {
          case 'running':
            taskIconClasses.add('gears');
            taskIcon.innerText = '';
            break;
          case 'pending':
            taskIconClasses.remove('gears');
            taskIcon.innerText = 'access_time';
            break;
          case 'ok':
            taskIconClasses.remove('gears');
            taskIcon.innerText = 'check';
            break;
          case 'ban':
            taskIconClasses.remove('gears');
            taskIcon.innerText = 'error_outline';
            break;
          case 'warn':
            taskIconClasses.remove('gears');
            taskIcon.innerText = 'error_outline';
            break;
          default:
            break;
        }
        // message
        if (task.msg) {
          const messageElement = taskEl.querySelector('.task-message');
          // messageElement.children.forEach(child => messageElement.removeChild(child));
          const htmlMessage = `<span>${task.msg}</span>`;
          // Yes, innerHTML is a security issue.
          // But this is ok since we are using hardcoded values, only.
          messageElement.innerHTML = htmlMessage;
        }
        // -task-status
        taskEl.dataset.taskStatus = task.status;
      }
    });
  };

  initFromLocation = (location) => {
    const pathMatch = location.pathname.match(/^(\/(?:@|%40)?)([A-Za-z0-9_]{1,15})$/);
    if (pathMatch) {
      this.screenName.value = pathMatch[2];
      this.screenNameLabel.classList.add('active');
      this.updateHeaderScreenName({
        stopPropagation: () => {},
        which: 20
      });
      window.history.replaceState(...this.screenNameHistoryState);
      this.runTest();
    }
  };

  setLocationForScreenName = () => {
    window.history.replaceState(...this.screenNameHistoryState);
  };

  get screenNameHistoryState() {
    const screenName = this.screenName.value;
    return [{ screenName }, `Testing ${screenName}`, `/${screenName}`];
  }

  // resets tasks to initial state (do this before each test!)
  reset = (screenName) => {
    this.updateTask({
      id: 'checkUser',
      status: 'running',
      msg: `در حال بررسی کاربر @${screenName}`
    }, {
      id: ['checkSearch', 'checkConventional', 'checkRefTweet', 'checkSuggest'],
      status: 'pending',
      msg: 'در انتظار کاربر.'
    });
    TechInfo.reset();
  }

  // Prevents running multiple tests at the same time (disables button/{Enter} on handle <input>);
  // otherwise the updateTask() calls would mess up the results
  lock = () => { this.checkButton.disabled = true; };

  // Enable button/{Enter} event
  release = () => { this.checkButton.disabled = false; };

  qfSettingToastDimsmiss(swiped) {
    localStorage.setItem('qf-option-toast', true);
    if (!swiped) {
      this.qfSettingToastInstance.dismiss();
    }
  }
  qfSettingToastShowMore() {
    this.qfSettingToastDimsmiss();
    this.tasksCollapsible.open(3);
    this.qfdFaqCollapsible.open(0);
    const headerElement = this.qfdFaqCollapsible.$headers.get(0);
    headerElement.classList.add('highlight');
    headerElement.addEventListener('animationend', () => {
      headerElement.classList.remove('highlight');
    }, {}, true);
  }

  static scrollToTop(element) {
    if (!element.querySelector('.collapsible-header').classList.contains('highlight')) {
      return;
    }
    const targetY = element.offsetTop - 20;
    const stepY = 15;
    let currentY = window.pageYOffset;
    const direction = currentY > targetY ? 'up' : 'down';

    const scrollInterval = window.setInterval(() => {
      currentY = direction === 'up' ? currentY - stepY : currentY + stepY;
      window.scrollTo(0, currentY);
      if (currentY >= targetY || currentY === window.innerHeight) {
        window.clearInterval(scrollInterval);
      }
    }, 10);
  }
}
