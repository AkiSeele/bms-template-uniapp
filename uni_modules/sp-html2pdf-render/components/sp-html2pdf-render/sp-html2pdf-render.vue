<template>
  <!-- prop是自定义的数据字段名，要与chang后的保持一致，h2pRender是renderjs的module名称 -->
  <view class="sp-html2pdf-render" :prop="domId" :change:prop="h2pRender.watchDomId">
    <!-- 导出的PDF会撑满宽度，所以请事先规范好要渲染盒子的宽度，PDF以一般A4纸大小尺寸，会自动分页 -->
    <!-- 默认带有插槽，但是具体是否要将渲染的dom盒子放入插槽中由开发者自行决定，导出结果只与domId有关 -->
    <slot></slot>
    <text :prop="expOver" :change:prop="h2pRender.watchExpOver"></text>
  </view>
</template>

<script>
import { base64ToPath } from '../../utils/index.js'
export default {
  props: {
    // 要渲染dom的id
    domId: {
      type: String,
      default: '',
      require: true
    },
    // 是否显示导出loading
    showLoading: {
      type: Boolean,
      default: true
    },
    // 导出的pdf文件名，默认使用当前时间戳，已自动拼接后缀
    pdfFileName: {
      type: String,
      default: ''
    },
    // 是否自动打开文档
    autoOpen: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      expOver: 0,
      // #ifdef VUE2
      // #ifdef APP
      // 只有在Vue2的APP真机中需要先声明h2pRender，否则会报错，若未报错建议删除此处代码
      h2pRender: null
      // #endif
      // #endif
    }
  },
  methods: {
    renderOver(e) {
      // canvas渲染图片完成
      this.$emit('renderOver', e)
    },
    savePDF(e) {
      // pdf生成完成
      if (this.showLoading) uni.showLoading({ title: '导出中' })

      this.$emit('beforeSavePDF', e)

      // 判断是否开启自动打开文件
      if (!this.autoOpen) {
        if (this.showLoading) uni.hideLoading()
        return
      }

      this.openPDF(e)
    },
    /**
     * 手动打开pdf文档
     * @param {Object} e pdf的base64字符串
     */
    openPDF(e) {
      /**
       * base64ToPath
       * @param {Object} e base64字符串
       * @param {String} name 导出的文件名（未命名则以当前时间戳命名，已自动拼接后缀）
       */
      base64ToPath(e, this.pdfFileName)
        .then((path) => {
          uni.openDocument({
            filePath: path,
            success: () => {
              this.$emit('successSavePDF', path)
            },
            fail: (err) => {
              console.error('openDocument error', err)
            }
          })
        })
        .catch((error) => {
          console.error('base64ToPath error', error)
        })
        .finally(() => {
          if (this.showLoading) uni.hideLoading()
        })
    },
    // 渲染事件
    async h2pRenderDom() {
      uni.showLoading({ title: '加载中' })

      // #ifdef H5
      await this.renderDom()
      // #endif
      // #ifndef H5
      // 控制expOver变量改变以触发RenderJs中渲染方法。
      this.expOver++
      // 处理你自己的逻辑.....
      // #endif

      uni.hideLoading()
    },
    permissionsForbidden(e) {
      uni.showModal({
        title: '存储权限',
        content: '您拒绝了存储权限，请前往 应用信息 → 应用权限管理，开启文件存储权限。',
        success: ({ confirm }) => {
          if (confirm) {
            // 用户点击确定，跳转至应用详情设置页
            uni.openAppAuthorizeSetting()
          } else {
            // 用户点击取消
          }
        }
      })
    }
  }
}
</script>

<!-- renderjs目前仅支持内联使用 -->
<script module="h2pRender" lang="renderjs">
import html2canvas from 'html2canvas';
import JsPDF from 'jspdf'

export default {
	data() {
		return {
			domIdValue: ''
		}
	},
	methods: {
		async renderDom() {
			// app无法通过传参获取domId,也无法直接获取到script中data或props数据
			// 必须通过特定的监听方式,与script通信,获取其data
			try {
				const el = document.getElementById(this.domIdValue);
        if(!el) {
          console.error('dom盒子未加载成功，请先确保dom渲染完成，再检查你的domId是否有误');
          return
        }
        /**
         * 配置说明
         * 1. allowTaint:true和useCORS:true都是解决跨域问题的方式(不一定完全能解决跨域)，不同的是使用allowTaint会对canvas造成污染，导致无法使用canvas.toDataURL方法
         * 2. 想要完美解决跨域，还得需要后端服务器设置access-control-allow-origin: *，允许资源跨域访问，前端设置useCORS:true
         * 2. scale通过放大倍率来调整画质清晰度，但是只调整这一个参数可能不是最优解
         */
				const canvas = await html2canvas(el, {
					width: el.offsetWidth,
					height: el.offsetHeight,
					x: 0,
					y: 0,
					logging: true,
					useCORS: true,
					// allowTaint: true,
					// async: false,
					scale: 2, // 2倍，增强清晰度
					// foreignObjectRendering: true, // 兼容性问题，慎用
				});
				const base64 = canvas.toDataURL('image/png', 1);
				this.$ownerInstance.callMethod('renderOver', base64);
				// 创建PDF

        // 页头页脚
        let divNode = document.createElement("div")
        divNode.style.width = '100%' // 设置div的宽度为100%
        divNode.style.height = '20px' // 设置div的高度为20px，用于页头页脚的高度
        document.body.appendChild(divNode)
        const divCanvas = await html2canvas(divNode, {
        	width: divNode.offsetWidth,
        	height: divNode.offsetHeight,
        	x: 0,
        	y: 0,
        	scale: 0.5, // 2倍，增强清晰度
          backgroundColor: '#ffffff', // 背景色，防止出现透明部分导致pdf背景色异常
        });

				this.createPDF(canvas, divCanvas)
			} catch(err) {
				console.log('==== err :', err);
			}
		},
		// 监听方式,与script通信,获取其data
		watchDomId(newValue, oldValue, ownerInstance, instance) {
			this.domIdValue = newValue
		},
    watchExpOver(newValue, oldValue, ownerInstance, instance) {
      if(newValue !== 0){
        // 初始不做监听，避免默认第一次就自动渲染
        this.renderDom()
      }
    },
		createPDF(canvas, divCanvas) {
      const a4width = 592.28; // A4纸宽度
      const a4height = 841.89; // A4纸高度
      const divheight = 20; // 页头页脚高度

			// 生成PDF
			let contentWidth = canvas.width
			let contentHeight = canvas.height
			// 一页pdf显示html页面生成的canvas高度;
			let pageHeight = (contentWidth / a4width) * a4height - divheight * 2
			// 未生成pdf的html页面高度
			let leftHeight = contentHeight
			// 页面偏移
			let position = 0
			// a4纸的尺寸[a4width,a4height]，html页面生成的canvas在pdf中图片的宽高
			let imgWidth = a4width
			let imgHeight = (a4width / contentWidth) * contentHeight
			let pageData = canvas.toDataURL('image/png', 1.0)
			let divData = divCanvas.toDataURL('image/png', 1.0)
			let pdf = new JsPDF('', 'pt', 'a4')
			// 有两个高度需要区分，一个是html页面的实际高度，和生成pdf的页面高度(a4height)
			// 当内容未超过pdf一页显示的范围，无需分页
			if (leftHeight < pageHeight) {
				// 在pdf.addImage(pageData, 'JPEG', 左，上，宽度，高度)设置在pdf中显示；
				pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight)
			} else {
				// 分页
				while (leftHeight > 0) {
					pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight)
          // 页头页尾占位
          pdf.addImage(divData, 'JPEG', 0, 0, imgWidth, divheight)
          pdf.addImage(divData, 'JPEG', 0, a4height - divheight, imgWidth, divheight)
					leftHeight -= pageHeight
					position -= a4height - divheight * 2
					// 避免添加空白页
					if (leftHeight > 0) {
						pdf.addPage()
					}
				}
			}
			// #ifdef H5
			//调用依赖获取读写手机储存权限的代码
			// pdf.save('PDF文件名')
      let base64Str = pdf.output('dataurlstring');
      this.$ownerInstance.callMethod('savePDF', base64Str)
			// #endif

			// #ifdef APP
			if(plus.os.name == 'Android') {
			  plus.android.requestPermissions(['android.permission.WRITE_EXTERNAL_STORAGE'], (e) => {
			    if (e.deniedAlways.length > 0) { //权限被永久拒绝
			      // 弹出提示框解释为何需要读写手机储存权限，引导用户打开设置页面开启
			      this.$ownerInstance.callMethod('permissionsForbidden', e);
			    }
			    if (e.deniedPresent.length > 0) { //权限被临时拒绝
			      // 弹出提示框解释为何需要读写手机储存权限，可再次调用plus.android.requestPermissions申请权限
			      plus.android.requestPermissions(['android.permission.WRITE_EXTERNAL_STORAGE'])
			    }
			    if (e.granted.length > 0) { //权限被允许
			      //调用依赖获取读写手机储存权限的代码
			      let base64Str = pdf.output('dataurlstring');
			      this.$ownerInstance.callMethod('savePDF', base64Str)
			    }
			  }, function(e) {
			  });
			} else {
			  // ios无须读写手机存储权限
			  let base64Str = pdf.output('dataurlstring');
			  this.$ownerInstance.callMethod('savePDF', base64Str)
			}
			// #endif
		}
	}
}
</script>

<style>
.sp-html2pdf-render {
  position: relative;
}
</style>
