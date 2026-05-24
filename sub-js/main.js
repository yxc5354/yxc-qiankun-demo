(function (global) {
  var root = null
  var propsCache = {}

  function getSharedState() {
    // 独立运行时没有主应用传参，提供一份兜底状态。
    return propsCache.sharedState || { user: '', count: 0, from: '' }
  }

  function render(props) {
    // 原生 JS 子应用直接操作 DOM，qiankun 挂载时优先使用 props.container。
    propsCache = props || {}
    var sharedState = getSharedState()
    var container = props && props.container
    root = container
      ? container.querySelector('#sub-js-app')
      : document.querySelector('#sub-js-app')

    root.innerHTML = [
      '<h2>原生 JS 子应用（sub-js-app）</h2>',
      '<p>这是原生 JavaScript 子应用</p>',
      '<p>主应用传参来源：' + (propsCache.from || '') + '</p>',
      '<p>全局用户：' + (sharedState.user || '') + '</p>',
      '<p>全局计数：' + Number(sharedState.count || 0) + '</p>',
      '<p>已写入全局变量 window.demoFromSubApp：sub-js-app</p>',
      '<p>卸载时会主动删除该变量，避免污染主应用和其他子应用</p>',
      '<button id="sub-js-add">原生 JS 子应用修改全局状态</button>'
    ].join('')

    root.querySelector('#sub-js-add').onclick = function () {
      var currentState = getSharedState()
      // 调用主应用传入的 actions，实现原生 JS 子应用修改全局状态。
      propsCache.actions && propsCache.actions.setGlobalState({
        ...currentState,
        count: Number(currentState.count || 0) + 1,
        from: '原生 JS 子应用'
      })
    }
  }

  global['sub-js-app'] = {
    bootstrap: function () {
      console.log('sub-js-app bootstrap')
      return Promise.resolve()
    },
    mount: function (props) {
      console.log('sub-js-app mount', props)
      // 故意写入全局变量，用于演示全局污染风险；unmount 中会主动清理。
      global.demoFromSubApp = 'sub-js-app'
      render(props)
      // 监听主应用全局状态变化，重新渲染原生 JS DOM。
      props.actions && props.actions.onGlobalStateChange(function (state, prevState) {
        console.log('sub-js-app global state change', state, prevState)
        propsCache.sharedState = state
        render(propsCache)
      }, true)
      return Promise.resolve()
    },
    unmount: function () {
      console.log('sub-js-app unmount')
      // 卸载时清理通信监听、全局变量和 DOM 内容。
      propsCache.actions && propsCache.actions.offGlobalStateChange()
      delete global.demoFromSubApp
      root.innerHTML = ''
      root = null
      propsCache = {}
      return Promise.resolve()
    }
  }

  // 手动加载时使用另一个微应用 name，因此也挂一份同样的生命周期对象。
  global['sub-js-app-manual'] = global['sub-js-app']

  // 独立访问子应用时不会经过 qiankun，需要自己执行渲染。
  if (!global.__POWERED_BY_QIANKUN__) {
    render()
  }
})(window)
