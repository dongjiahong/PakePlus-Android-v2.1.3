# 注意：本应用的图标用的是 ~/Downloads/axiom-icons 里的 Android 图标包（手工覆盖 app/src/main/res）。
# 直接跑本脚本会用 --icon 那张图重新生成一套图标并覆盖它们，重打时记得跑完再把图标包拷回去。
npm run packplus -- --url https://axiom.aidan.dpdns.org/ --icon /Users/lele/Downloads/axiom-icons/android/PlayStore-512.png --app-name Axiom --app-flag com.axiom.djh --app-version 0.0.2
