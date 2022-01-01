"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[572],{7179:function(e,a,n){n.d(a,{$_:function(){return o},h4:function(){return m},zS:function(){return A}});var r=n(5893),t=n(7294),i=n(9121),o=function(){return(0,r.jsxs)("footer",{children:[(0,r.jsx)("p",{children:"Created by: Adam Lui"}),(0,r.jsx)(i.QZ,{url:"https://github.com/Awingfu/web-finance-app",bgColor:"transparent",fgColor:"black",target:"_blank",rel:"noreferrer noopener"})]})},b=n(9008),c=n(1664),l=n(9787),u=n(682),f=n(5498),s=function(){return(0,r.jsx)(l.Z,{bg:"primary",variant:"dark",children:(0,r.jsxs)(u.Z,{children:[(0,r.jsx)(c.default,{href:"/",passHref:!0,children:(0,r.jsx)(l.Z.Brand,{children:" Finance App "})}),(0,r.jsxs)(f.Z,{className:"me-auto",children:[(0,r.jsx)(c.default,{href:"/paycheck",passHref:!0,children:(0,r.jsx)(f.Z.Link,{children:" Paycheck "})}),(0,r.jsx)(c.default,{href:"/retirement/frontload",passHref:!0,children:(0,r.jsx)(f.Z.Link,{children:" 401k Frontload "})})]})]})})},d=n(4548),m=function(e){var a=e.titleName,n=a?"| "+a:"",i="Adam Lui finance "+a;return(0,r.jsxs)(t.Fragment,{children:[(0,r.jsxs)(b.default,{children:[(0,r.jsxs)("title",{children:[" Finance App ",n," "]}),(0,r.jsx)("meta",{name:"description",content:i}),(0,r.jsx)("link",{rel:"icon",href:"".concat(d.O4,"/favicon.ico")})]}),(0,r.jsx)(s,{})]})},v=n(3489),h=n(2866);function N(e,a,n){return a in e?Object.defineProperty(e,a,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[a]=n,e}var I=function(e){return(0,r.jsx)(v.Z,function(e){for(var a=1;a<arguments.length;a++){var n=null!=arguments[a]?arguments[a]:{},r=Object.keys(n);"function"===typeof Object.getOwnPropertySymbols&&(r=r.concat(Object.getOwnPropertySymbols(n).filter((function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable})))),r.forEach((function(a){N(e,a,n[a])}))}return e}({id:"button-tooltip"},e,{children:e.text}))},A=function(e){return(0,r.jsx)(h.Z,{placement:"bottom",delay:{show:700,hide:200},overlay:I({text:e.text}),children:e.nest})}},3135:function(e,a,n){function r(e,a,n){return a in e?Object.defineProperty(e,a,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[a]=n,e}var t,i,o,b,c;n.d(a,{W1:function(){return t},kS:function(){return o},qJ:function(){return s},mQ:function(){return d},Bz:function(){return l},Qp:function(){return m}}),(i=t||(t={})).SINGLE="Single",i.MARRIED_FILING_JOINTLY="Married Filing Jointly",i.MARRIED_FILING_SEPARATELY="Married Filing Separatly",i.HEAD_OF_HOUSEHOLD="Head of Household",(b=o||(o={})).PAYCHECK="Paycheck",b.DAY="Day",b.WEEK="Week",b.MONTH="Month",b.ANNUM="Annum";var l,u,f,s=(r(c={},o.PAYCHECK,0),r(c,o.DAY,365),r(c,o.WEEK,52),r(c,o.MONTH,12),r(c,o.ANNUM,1),c),d=Object.keys(o);(u=l||(l={})).WEEKLY="Weekly",u.BIWEEKLY="Biweekly",u.BIMONTHLY="Bimonthly",u.MONTHLY="Monthly";var m=(r(f={},l.WEEKLY,52),r(f,l.BIWEEKLY,26),r(f,l.BIMONTHLY,24),r(f,l.MONTHLY,12),f);Object.keys(l)},4548:function(e,a,n){n.d(a,{j7:function(){return A},sI:function(){return l},Y2:function(){return h},UA:function(){return s},Pu:function(){return I},xG:function(){return M},w0:function(){return m},GY:function(){return N},Q5:function(){return d},O4:function(){return x}});var r=n(3135);function t(e,a,n){return a in e?Object.defineProperty(e,a,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[a]=n,e}var i,o,b=function(e){if(!(e[r.W1.SINGLE][0].length>3))for(var a in e)for(var n=0,t=0,i=0;i<e[a].length;i++){var o=e[a][i];o.push(n+t),n+=t,i!=e[a].length&&(t=(o[1]-o[0])*o[2])}},c=(t(i={},r.W1.SINGLE,[[0,6275,0],[6275,11250,.1],[11250,26538,.12],[26538,49463,.22],[49463,88738,.24],[88738,110988,.32],[110988,268075,.35],[268075,1/0,.37]]),t(i,r.W1.MARRIED_FILING_JOINTLY,[[0,12550,0],[12550,22500,.1],[22500,53075,.12],[53075,98925,.22],[98925,177475,.24],[177475,221975,.32],[221975,326700,.35],[326700,1/0,.37]]),t(i,r.W1.MARRIED_FILING_SEPARATELY,[[0,6275,0],[6275,11250,.1],[11250,26538,.12],[26538,49463,.22],[49463,88738,.24],[88738,110988,.32],[110988,268075,.35],[268075,1/0,.37]]),t(i,r.W1.HEAD_OF_HOUSEHOLD,[[0,9400,0],[9400,16500,.1],[16500,36500,.12],[36500,52575,.22],[52575,91850,.24],[91850,114100,.32],[114100,271200,.35],[271200,1/0,.37]]),i),l=function(e,a){for(var n=(b(c),c)[a],r=0;r<n.length;r++)if(n[r][1]===1/0||n[r][1]>e)return console.log("You're at the "+100*n[r][2]+"% Federal withholding bracket."),n[r][3]+(e-n[r][0])*n[r][2];return console.log("Unreachable code reached, returning 0 for federal withholding."),0},u=t({},r.W1.SINGLE,[[0,142800,.062],[142800,1/0,0]]),f=function(){return b(u),u},s=function(e){for(var a=f()[r.W1.SINGLE],n=0;n<a.length;n++)if(a[n][1]===1/0||a[n][1]>e)return a[n][3]+(e-a[n][0])*a[n][2];return console.log("Unreachable code reached, returning 0 for SS withholding."),0},d=f()[r.W1.SINGLE][1][3],m=u[r.W1.SINGLE][0][2],v=(t(o={},r.W1.SINGLE,[[0,2e5,.0145],[2e5,1/0,.0235]]),t(o,r.W1.MARRIED_FILING_JOINTLY,[[0,25e4,.0145],[25e4,1/0,.0235]]),t(o,r.W1.MARRIED_FILING_SEPARATELY,[[0,125e3,.0145],[125e3,1/0,.0235]]),t(o,r.W1.HEAD_OF_HOUSEHOLD,[[0,2e5,.0145],[2e5,1/0,.0235]]),o),h=function(e,a){for(var n=(b(v),v)[a],r=0;r<n.length;r++)if(n[r][1]===1/0||n[r][1]>e)return n[r][3]+(e-n[r][0])*n[r][2];return console.log("Unreachable code reached, returning 0 for Medicare withholding."),0};function N(e){return!(e.brackets||void 0!=e.flatTax)}var I=function(e,a,n){var t,i=A[e],o=a;if(i.marriedStandardDeduction&&n===r.W1.MARRIED_FILING_JOINTLY?o=a-i.marriedStandardDeduction:i.standardDeduction&&(o=a-i.standardDeduction),N(i))return console.log(i.name+" State's taxes are not defined, returning 0."),0;if(!(t=i).brackets&&void 0!=t.flatTax)return console.log(i.name+" State has a flat tax of "+i.flatTax+"%"),i.flatTax*o;if(function(e){return!e.flatTax&&e.brackets}(i)){var b=i.brackets;n===r.W1.MARRIED_FILING_JOINTLY&&i.marriedBrackets&&(b=i.marriedBrackets),function(e){if(4!==e[0].length)for(var a=0,n=0,r=0;r<e.length;r++){var t=e[r];t.push(a+n),a+=n,r!=e.length&&(n=(t[1]-t[0])*t[2])}}(b);for(var c=0;c<b.length;c++)if(b[c][1]===1/0||b[c][1]>o)return console.log("You're at the "+100*b[c][2]+"% tax bracket for "+i.name+" State"),b[c][3]+(o-b[c][0])*b[c][2]}return console.log("State tax withholding error. Unreachable code reached."),0},A={None:{name:"None",abbreviation:"None",flatTax:0},AL:{name:"Alabama",abbreviation:"AL"},AK:{name:"Alaska",abbreviation:"AK",flatTax:0},AS:{name:"American Samoa",abbreviation:"AS"},AZ:{name:"Arizona",abbreviation:"AZ"},AR:{name:"Arkansas",abbreviation:"AR"},CA:{name:"California",abbreviation:"CA",standardDeduction:4601,marriedStandardDeduction:4601,brackets:[[0,8932,.011],[8932,21175,.022],[21175,33421,.044],[33421,46394,.066],[46394,58634,.088],[58634,299508,.1023],[299508,359407,.1133],[359407,499012,.1243],[499012,1e6,.1353],[1e6,1/0,.1463]],marriedBrackets:[[0,17864,.011],[17864,42350,.022],[42350,66842,.044],[66842,92788,.066],[92788,117268,.088],[117268,599016,.1023],[599016,718814,.1133],[718814,1e6,.1243],[1e6,1198024,.1353],[1198024,1/0,.1463]]},CO:{name:"Colorado",abbreviation:"CO",flatTax:.0455},CT:{name:"Connecticut",abbreviation:"CT"},DE:{name:"Delaware",abbreviation:"DE"},DC:{name:"District Of Columbia",abbreviation:"DC",brackets:[[0,1e4,.04],[1e4,4e4,.06],[4e4,6e4,.065],[6e4,25e4,.085],[25e4,5e5,.0925],[5e5,1e6,.0975],[1e6,1/0,.1075]]},FM:{name:"Federated States Of Micronesia",abbreviation:"FM"},FL:{name:"Florida",abbreviation:"FL",flatTax:0},GA:{name:"Georgia",abbreviation:"GA"},GU:{name:"Guam",abbreviation:"GU"},HI:{name:"Hawaii",abbreviation:"HI"},ID:{name:"Idaho",abbreviation:"ID"},IL:{name:"Illinois",abbreviation:"IL",flatTax:.0495},IN:{name:"Indiana",abbreviation:"IN",flatTax:.0323},IA:{name:"Iowa",abbreviation:"IA"},KS:{name:"Kansas",abbreviation:"KS"},KY:{name:"Kentucky",abbreviation:"KY",flatTax:.05},LA:{name:"Louisiana",abbreviation:"LA"},ME:{name:"Maine",abbreviation:"ME"},MH:{name:"Marshall Islands",abbreviation:"MH"},MD:{name:"Maryland",abbreviation:"MD",brackets:[[0,1e5,.0475],[1e5,125e3,.05],[125e3,15e4,.0525],[15e4,25e4,.055],[25e4,1/0,.0575]],marriedBrackets:[[0,15e4,.0475],[15e4,175e3,.05],[175e3,225e3,.0525],[225e3,3e5,.055],[3e5,1/0,.0575]]},MA:{name:"Massachusetts",abbreviation:"MA",flatTax:.05},MI:{name:"Michigan",abbreviation:"MI",flatTax:.0425},MN:{name:"Minnesota",abbreviation:"MN"},MS:{name:"Mississippi",abbreviation:"MS"},MO:{name:"Missouri",abbreviation:"MO",brackets:[[0,1121,.015],[1121,2242,.02],[2242,3363,.025],[3363,4484,.03],[4484,5605,.035],[5605,6726,.04],[6726,7847,.045],[7847,8968,.05],[8968,1/0,.053]]},MT:{name:"Montana",abbreviation:"MT"},NE:{name:"Nebraska",abbreviation:"NE"},NV:{name:"Nevada",abbreviation:"NV",flatTax:0},NH:{name:"New Hampshire",abbreviation:"NH",flatTax:0},NJ:{name:"New Jersey",abbreviation:"NJ"},NM:{name:"New Mexico",abbreviation:"NM"},NY:{name:"New York",abbreviation:"NY"},NC:{name:"North Carolina",abbreviation:"NC",flatTax:.0525},ND:{name:"North Dakota",abbreviation:"ND"},MP:{name:"Northern Mariana Islands",abbreviation:"MP"},OH:{name:"Ohio",abbreviation:"OH"},OK:{name:"Oklahoma",abbreviation:"OK"},OR:{name:"Oregon",abbreviation:"OR"},PW:{name:"Palau",abbreviation:"PW"},PA:{name:"Pennsylvania",abbreviation:"PA",flatTax:.0307},PR:{name:"Puerto Rico",abbreviation:"PR"},RI:{name:"Rhode Island",abbreviation:"RI"},SC:{name:"South Carolina",abbreviation:"SC"},SD:{name:"South Dakota",abbreviation:"SD",flatTax:0},TN:{name:"Tennessee",abbreviation:"TN",flatTax:0},TX:{name:"Texas",abbreviation:"TX",flatTax:0},UT:{name:"Utah",abbreviation:"UT",flatTax:.0495},VT:{name:"Vermont",abbreviation:"VT"},VI:{name:"Virgin Islands",abbreviation:"VI"},VA:{name:"Virginia",abbreviation:"VA",standardDeduction:4500,marriedStandardDeduction:9e3,brackets:[[0,3e3,.02],[3e3,5e3,.03],[5e3,17e3,.05],[17e3,1/0,.0575]]},WA:{name:"Washington",abbreviation:"WA",flatTax:0},WV:{name:"West Virginia",abbreviation:"WV"},WI:{name:"Wisconsin",abbreviation:"WI"},WY:{name:"Wyoming",abbreviation:"WY",flatTax:0}},M=function(e){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(e)},x="/web-finance-app"}}]);