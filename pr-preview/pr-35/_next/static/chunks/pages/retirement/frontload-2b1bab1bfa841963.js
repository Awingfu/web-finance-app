(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[71],{4951:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/retirement/frontload",function(){return n(1116)}])},1116:function(e,t,n){"use strict";n.r(t);var r=n(5893),i=n(7294),s=n(8375),a=n(1967),l=n(2318),o=n(6986),c=n(5147),u=n(6785),h=n(9129),m=n(2166),x=n(7027),d=n.n(x);t.default=function(){let[e,t]=i.useState(6e4),[n,x]=i.useState(m.kC),[b,j]=i.useState(m.wM),[y,Z]=i.useState(24),[p,C]=i.useState(0),[g,T]=i.useState(0),[N,k]=i.useState(0),[v,w]=i.useState(0),[f,_]=i.useState(6),[S,A]=i.useState(90),[F,L]=i.useState(0),[G,E]=i.useState(0),[K,z]=i.useState(6),[P,$]=i.useState(!1),[R,W]=i.useState(!1),[M,I]=i.useState(!1),[O,B]=i.useState(!1),[X,U]=i.useState(!1),[Y,D]=i.useState(!1),V=(0,r.jsx)(r.Fragment,{}),q=(0,r.jsx)(r.Fragment,{}),H=(0,r.jsx)(r.Fragment,{}),J=(0,r.jsx)(r.Fragment,{}),Q=new h.Rx(e,y,p,g,N,v,n,b,f,S,F,G,K,"‾","†","‡",P,Y,R);p>0&&(V=(0,r.jsx)(s.Z,{className:"mb-3",variant:"secondary",children:"‾ Pay period has already passed"})),Q.maxReachedEarly&&(J=(0,r.jsx)(s.Z,{className:"mb-3",variant:"secondary",children:"‡ You will reach your maximum contribution early even with minimum matching available. Future contributions for the year will not be possible if your employer limits your contributions"})),Q.maxNotReached&&(q=(0,r.jsx)(s.Z,{className:"mb-3",variant:"secondary",children:"† If your employer limits your 401k contribution, bump the last contribution up in order to max your 401k."})),Q.maxReachedWithAutomaticCap&&(H=(0,r.jsx)(s.Z,{className:"mb-3",variant:"secondary",children:"† Since your employer limits your 401k contribution, this last contribution should max your contributions."}));let ee=function(e,t){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:1e9,i=parseFloat(e.target.value);isNaN(i)||i<n?i=n:i>r&&(i=r),t===Z&&i<=p&&(C(i-1),1===i&&en()),t===C&&0===i&&en(),t(i)},et=(e,t)=>{let n=e.target.checked;t!==I||n||(C(0),en()),t===B&&er(),t===U&&ei(),t(n)},en=()=>{T(0),k(0),w(0)},er=()=>{x(m.kC),j(m.wM)},ei=()=>{L(0),E(0)},es=function(e,t){let n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:100,i=arguments.length>4&&void 0!==arguments[4]&&arguments[4],s=e.target.value,a=i?Math.round(100*parseFloat(s))/100:parseInt(s);isNaN(a)||a<n?a=n:a>r&&(a=r),t(a)};return(0,r.jsxs)("div",{className:d().container,children:[(0,r.jsx)(u.h4,{titleName:"401k Frontload"}),(0,r.jsxs)("main",{className:d().main,children:[(0,r.jsx)("h1",{children:"401k Frontloader"}),(0,r.jsx)("p",{children:"Maximize your 401k contributions by frontloading while ensuring minimum contributions throughout the year."})]}),(0,r.jsxs)("div",{className:d().content,children:[(0,r.jsxs)(a.Z,{className:d().form,children:[(0,r.jsx)(a.Z.Label,{children:"Annual Salary"}),(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(l.Z.Text,{children:"$"}),(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(e),onChange:e=>ee(e,t)})]}),(0,r.jsx)(a.Z.Label,{children:"Number of Pay Periods this Year"}),(0,r.jsx)(l.Z,{className:"mb-3 w-100",children:(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(y),onChange:e=>ee(e,Z,1,260)})}),(0,r.jsx)(a.Z.Label,{children:"Minimum Desired Paycheck Contribution"}),(0,r.jsx)(u.zS,{text:"% of income between 0 and 100. Set this to ensure your employer will match your contributions if they calculate the match based on each pay period instead of the whole year.",nest:(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(f),onChange:e=>es(e,_)}),(0,r.jsx)(l.Z.Text,{children:"%"})]})}),(0,r.jsx)(a.Z.Label,{children:"Maximum Paycheck Contribution"}),(0,r.jsx)(u.zS,{text:"% of income between 0 and 100. This is the maximum amount you are comfortable or allowed to contribute.",nest:(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(S),onChange:e=>es(e,A)}),(0,r.jsx)(l.Z.Text,{children:"%"})]})}),(0,r.jsx)(u.zS,{text:"Check this if your 401k automatically limits individual contributions.",nest:(0,r.jsx)(l.Z,{className:"mb-3 w-50",children:(0,r.jsx)(a.Z.Check,{type:"checkbox",onChange:()=>$(!P),label:"401k Limits Contributions",checked:P})})}),(0,r.jsx)(u.zS,{text:"Check this to add contributions in past pay periods in the year.",nest:(0,r.jsx)(l.Z,{className:"mb-3 w-50",children:(0,r.jsx)(a.Z.Check,{type:"checkbox",onChange:e=>et(e,I),label:"Add Existing Contributions",checked:M})})}),M&&(0,r.jsxs)(o.Z,{children:[(0,r.jsx)(a.Z.Label,{children:"Number of Pay Periods So Far"}),(0,r.jsx)(l.Z,{className:"mb-3 w-100",children:(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(p),onChange:e=>ee(e,C,0,y-1)})}),(0,r.jsx)(a.Z.Label,{children:"Amount Contributed to 401k So Far"}),(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(l.Z.Text,{children:"$"}),(0,r.jsx)(a.Z.Control,{disabled:0===p,type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(g),onChange:e=>ee(e,T,0,n)})]})]}),(0,r.jsx)(u.zS,{text:"Check this to show employer contributions in table. This tool does not limit employer contributions to the total 401k limit.",nest:(0,r.jsx)(l.Z,{className:"mb-3 w-50",children:(0,r.jsx)(a.Z.Check,{type:"checkbox",onChange:e=>et(e,U),label:"Show Employer Contributions",checked:X})})}),X&&(0,r.jsxs)(o.Z,{children:[M&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(a.Z.Label,{children:"Employer Contributions So Far"}),(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(l.Z.Text,{children:"$"}),(0,r.jsx)(a.Z.Control,{disabled:0===p,type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(N),onChange:e=>ee(e,k,0,b-n)})]})]}),(0,r.jsx)(a.Z.Label,{children:"Employer 401k Base Contribution"}),(0,r.jsx)(u.zS,{text:"This is how much your employer contributes regardless of your contributions.",nest:(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(F),onChange:e=>es(e,L,0,100,!0)}),(0,r.jsx)(l.Z.Text,{children:"%"})]})}),(0,r.jsx)(a.Z.Label,{className:d().inlineGroupFormLabel,children:"Employer 401k Match"}),(0,r.jsx)(u.zS,{text:"This is how much your employer contributes dependent on your contributions.",nest:(0,r.jsxs)("div",{className:d().inlineGroup,children:[(0,r.jsxs)(l.Z,{className:d().inlineChildren,children:[(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(G),onChange:e=>es(e,E,0,500,!0)}),(0,r.jsx)(l.Z.Text,{children:"%"})]}),(0,r.jsx)("p",{className:"styles.",children:" Up To "}),(0,r.jsxs)(l.Z,{className:d().inlineChildren,children:[(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(K),onChange:e=>es(e,z,0,100,!0)}),(0,r.jsx)(l.Z.Text,{children:"%"})]})]})})]}),(0,r.jsx)(u.zS,{text:"A.K.A. Mega Backdoor Roth. This tool assumes your 401k cannot limit this amount and may round down the after-tax contribution. This tool will prioritize individual over after-tax contributions.",nest:(0,r.jsx)(l.Z,{className:"mb-3 w-50",children:(0,r.jsx)(a.Z.Check,{type:"checkbox",onChange:e=>et(e,D),label:"Show After-Tax 401k",checked:Y})})}),M&&Y&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(a.Z.Label,{children:"After-Tax Contributions So Far"}),(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(l.Z.Text,{children:"$"}),(0,r.jsx)(a.Z.Control,{disabled:0===p,type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(v),onChange:e=>ee(e,w,0,Q.maxAfterTaxAmount)})]})]}),Y&&(0,r.jsxs)(a.Z.Group,{children:[(0,r.jsx)(a.Z.Label,{children:"Estimated Maximum Employer Match Contribution"}),(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(l.Z.Text,{children:"$"}),(0,r.jsx)(a.Z.Control,{disabled:!0,type:"number",value:Q.maxEmployerAmount})]}),(0,r.jsx)(a.Z.Label,{children:"Maximum After-Tax Contribution"}),(0,r.jsx)(u.zS,{text:"This is the result of (Total - Individual - Employer) Contribution Maximums = ".concat(b," - ").concat(n," - ").concat(Q.maxEmployerAmount,"."),nest:(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(l.Z.Text,{children:"$"}),(0,r.jsx)(a.Z.Control,{disabled:!0,type:"number",onWheel:e=>e.currentTarget.blur(),value:Q.maxAfterTaxAmount})]})})]}),(0,r.jsx)(u.zS,{text:"Check this to update 401k Limits.",nest:(0,r.jsx)(l.Z,{className:"mb-3 w-50",children:(0,r.jsx)(a.Z.Check,{type:"checkbox",onChange:e=>et(e,B),label:"Update 401k Limits",checked:O})})}),O&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(a.Z.Label,{children:"401k Maximum for Individual Contribution"}),(0,r.jsx)(u.zS,{text:"The maximum in 2023 is $22,500.",nest:(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(l.Z.Text,{children:"$"}),(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(n),onChange:e=>ee(e,x)})]})})]}),O&&Y&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(a.Z.Label,{children:"401k Total Maximum"}),(0,r.jsx)(u.zS,{text:"The maximum in 2023 is $66,000.",nest:(0,r.jsxs)(l.Z,{className:"mb-3 w-100",children:[(0,r.jsx)(l.Z.Text,{children:"$"}),(0,r.jsx)(a.Z.Control,{type:"number",onWheel:e=>e.currentTarget.blur(),value:(0,h.Kb)(b),onChange:e=>ee(e,j)})]})})]})]}),(0,r.jsxs)("div",{className:d().table,children:[(0,r.jsxs)(c.Z,{hover:!0,responsive:!0,size:"sm",className:"mb-3",children:[(0,r.jsx)("thead",{children:(0,r.jsxs)("tr",{children:[(0,r.jsx)("th",{children:"Pay Period"}),(0,r.jsx)("th",{children:"Gross Pay ($)"}),(0,r.jsx)("th",{children:"Contribution (%)"}),(0,r.jsx)("th",{children:"Contribution ($)"}),X&&(0,r.jsx)("th",{children:" Employer Contribution ($) "}),Y&&(0,r.jsx)("th",{children:" After-Tax Contribution (%) "}),Y&&(0,r.jsx)("th",{children:" After-Tax Contribution ($) "}),(0,r.jsx)("th",{children:"Cumulative ($)"})]})}),(0,r.jsx)("tbody",{children:Q.getTable().map(e=>(0,r.jsxs)("tr",{children:[(0,r.jsx)("td",{className:d().thicc,children:e.rowKey}),(0,r.jsx)("td",{children:(0,h.xG)(e.payPerPayPeriod)}),(0,r.jsx)("td",{children:(0,h.T3)(e.contributionFraction)}),(0,r.jsx)("td",{children:(0,h.xG)(e.contributionAmount)}),X&&(0,r.jsx)("td",{children:(0,h.xG)(e.employerAmount)}),Y&&(0,r.jsx)("td",{children:(0,h.T3)(e.afterTaxPercent)}),Y&&(0,r.jsx)("td",{children:(0,h.xG)(e.afterTaxAmount)}),(0,r.jsx)("td",{children:(0,h.xG)(e.cumulativeAmountTotal)})]},e.rowKey))}),(0,r.jsx)("tfoot",{children:(0,r.jsxs)("tr",{children:[(0,r.jsx)("td",{children:"Total"}),(0,r.jsx)("td",{children:(0,h.xG)(Q.salaryRemaining)}),(0,r.jsx)("td",{}),(0,r.jsx)("td",{children:(0,h.xG)(Q.getTable()[y-1].cumulativeIndividualAmount)}),X&&(0,r.jsx)("td",{children:(0,h.xG)(Q.getTable()[y-1].cumulativeEmployerAmount)}),Y&&(0,r.jsx)("td",{}),Y&&(0,r.jsx)("td",{children:(0,h.xG)(Q.getTable()[y-1].cumulativeAfterTaxAmount)}),(0,r.jsx)("td",{children:(0,h.xG)(Q.getTable()[y-1].cumulativeAmountTotal)})]})})]}),V,q,H,J]})]}),(0,r.jsx)(u.$_,{})]})}},7027:function(e){e.exports={container:"Retirement_container__oueG5",main:"Retirement_main__Vm_d9",form:"Retirement_form__gAFN2",table:"Retirement_table__4iNKI",tbody:"Retirement_tbody__57OnC",content:"Retirement_content__z6Nve",inlineGroupFormLabel:"Retirement_inlineGroupFormLabel__ym5g5",inlineGroup:"Retirement_inlineGroup__l58cy",inlineChildren:"Retirement_inlineChildren__BikOX"}}},function(e){e.O(0,[851,352,785,774,888,179],function(){return e(e.s=4951)}),_N_E=e.O()}]);