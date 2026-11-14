/* Curated additions to the local bank. Examples reuse the reviewed reference. */
(function(root){
  'use strict';
  const rows={
    '科技与教育':[
      ['数字素养应成为学校教育的一部分，帮助学生辨别不可靠的信息。','Digital literacy should be part of school education to help students distinguish reliable information from misleading claims.','digital literacy','数字素养','misleading claims','误导性说法'],
      ['小班教学让教师有更多机会给学生提供个性化反馈。','Smaller classes give teachers more opportunities to provide personalised feedback and address individual learning difficulties.','personalised feedback','个性化反馈','learning difficulties','学习困难'],
      ['大学不应只为学生找工作做准备，也应鼓励他们追求知识。','Universities should not merely prepare students for employment but also encourage them to pursue knowledge for its own sake.','prepare students for employment','为学生就业做准备','for its own sake','为了事物本身的价值'],
      ['并非所有家庭都能买得起电子设备，因此线上课程需要更具包容性。','Not every family can afford digital devices, so online courses need to be designed with greater inclusivity in mind.','afford digital devices','负担得起电子设备','with greater inclusivity in mind','考虑到更广泛的包容性'],
      ['让学生参与实际项目，有助于弥合课堂知识和实际应用之间的差距。','Involving students in practical projects can help bridge the gap between classroom knowledge and real-world application.','bridge the gap','弥合差距','real-world application','实际应用'],
      ['即使技术发展迅速，面对面的讨论仍然有独特的教育价值。','Despite rapid technological advances, face-to-face discussions still have distinctive educational value.','technological advances','技术进步','educational value','教育价值'],
      ['合理使用学习软件可以提高效率，但不断弹出的通知会分散注意力。','Using learning software wisely can improve efficiency, but constant notifications may distract students from the task at hand.','constant notifications','不断出现的通知','the task at hand','手头的任务'],
      ['评价学校时，除了考试成绩，还应考虑学生的身心健康。','When evaluating schools, student well-being should be considered alongside examination results.','student well-being','学生的身心健康','examination results','考试成绩']
    ],
    '全球化':[
      ['跨国合作可以让各国共享专业知识，并更快应对共同挑战。','International cooperation allows countries to share expertise and respond more quickly to shared challenges.','share expertise','共享专业知识','shared challenges','共同挑战'],
      ['全球供应链提高了效率，但也使企业更容易受到海外事件的影响。','Global supply chains improve efficiency while making businesses more vulnerable to events overseas.','global supply chains','全球供应链','vulnerable to','容易受到影响的'],
      ['掌握另一门语言有助于打破文化障碍，也能拓展职业选择。','Learning another language helps break down cultural barriers and opens up a wider range of career opportunities.','break down cultural barriers','打破文化障碍','career opportunities','职业机会'],
      ['旅游业能带来收入，但当地居民也应从发展中公平受益。','Tourism can generate income, but local residents should also receive a fair share of the benefits.','generate income','创造收入','a fair share of','公平的一份'],
      ['企业在进入海外市场时，需要尊重当地的习俗和消费偏好。','Businesses entering overseas markets need to respect local customs and take consumer preferences into account.','overseas markets','海外市场','take consumer preferences into account','考虑消费者偏好'],
      ['移民政策既要回应劳动力需求，也要支持新居民融入社会。','Immigration policies should respond to labour shortages while helping newcomers integrate into society.','labour shortages','劳动力短缺','integrate into society','融入社会'],
      ['国际新闻让我们了解远方的事件，但也需要谨慎核实信息。','International news keeps us informed about distant events, but the information still needs to be checked carefully.','keeps us informed','让我们了解情况','distant events','远方发生的事件'],
      ['价格低廉的进口商品使消费者受益，却可能增加当地生产者的压力。','Affordable imported goods benefit consumers but may put local producers under greater pressure.','imported goods','进口商品','under greater pressure','承受更大压力'],
      ['应对气候变化需要各国承担与自身能力相称的责任。','Addressing climate change requires countries to take on responsibilities that reflect their respective capabilities.','take on responsibilities','承担责任','respective capabilities','各自的能力']
    ],
    '环境保护':[
      ['改善自行车道可以使短途出行更安全，并减少对汽车的依赖。','Improving cycle lanes can make short journeys safer and reduce dependence on private cars.','cycle lanes','自行车道','reduce dependence on','减少对某物的依赖'],
      ['提高能源效率通常比单纯增加能源供应更有利于节约资源。','Improving energy efficiency often conserves resources more effectively than simply increasing the energy supply.','energy efficiency','能源效率','conserves resources','节约资源'],
      ['企业应为产品的整个生命周期负责，包括回收和废弃处理。','Companies should take responsibility for the entire life cycle of their products, including recycling and disposal.','take responsibility for','对某事负责','the entire life cycle','整个生命周期'],
      ['城市中的绿地既能改善空气质量，也能给居民提供休闲空间。','Urban green spaces can improve air quality while providing residents with places to relax.','urban green spaces','城市绿地','air quality','空气质量'],
      ['对一次性包装收费，可以鼓励消费者选择可重复使用的替代品。','Charging for disposable packaging can encourage consumers to choose reusable alternatives.','disposable packaging','一次性包装','reusable alternatives','可重复使用的替代品'],
      ['环境政策只有得到公众理解和支持，才能产生长远影响。','Environmental policies can have a lasting impact only when the public understands and supports them.','environmental policies','环境政策','a lasting impact','长远影响'],
      ['减少食物浪费需要生产者、零售商和家庭共同努力。','Reducing food waste requires a collective effort from producers, retailers and households.','food waste','食物浪费','a collective effort','共同努力'],
      ['可再生能源的成本在下降，但储能设施仍需要进一步投资。','The cost of renewable energy is falling, but further investment in energy storage is still needed.','renewable energy','可再生能源','energy storage','能源储存'],
      ['保护自然栖息地，可以避免许多物种在受到关注之前就消失。','Protecting natural habitats can prevent many species from disappearing before their decline attracts public attention.','natural habitats','自然栖息地','attracts public attention','引起公众关注']
    ],
    '健康与体育':[
      ['给心理健康更多关注，可以帮助人们在问题恶化之前寻求支持。','Paying greater attention to mental health can help people seek support before their problems become more serious.','mental health','心理健康','seek support','寻求支持'],
      ['充足的睡眠有助于提高注意力，也能改善情绪调节能力。','Getting enough sleep helps improve concentration and strengthens our ability to regulate emotions.','improve concentration','提高注意力','regulate emotions','调节情绪'],
      ['社区运动设施应让不同年龄和收入的人都能方便使用。','Community sports facilities should be accessible to people of different ages and income levels.','sports facilities','体育设施','income levels','收入水平'],
      ['健康饮食不一定昂贵，关键在于合理计划和选择多样的食物。','A healthy diet does not have to be expensive; careful planning and a varied choice of foods can make a difference.','a healthy diet','健康饮食','make a difference','产生积极影响'],
      ['参加团队运动可以培养合作意识，而不仅仅是提高身体素质。','Taking part in team sports can foster cooperation as well as improve physical fitness.','foster cooperation','培养合作精神','physical fitness','身体素质'],
      ['工作场所应鼓励员工定期休息，以减少长时间坐着带来的风险。','Workplaces should encourage employees to take regular breaks to reduce the risks associated with prolonged sitting.','take regular breaks','定期休息','prolonged sitting','久坐'],
      ['公共健康宣传应提供切实可行的建议，而不是让人产生羞耻感。','Public health campaigns should offer practical advice rather than make people feel ashamed of their habits.','public health campaigns','公共健康宣传','practical advice','切实可行的建议'],
      ['适度锻炼更容易长期坚持，也比短期过度训练更稳妥。','Moderate exercise is easier to sustain over time and is safer than excessive training over a short period.','moderate exercise','适度锻炼','sustain over time','长期坚持'],
      ['公平获取基本医疗服务，不应取决于一个人住在哪里。','Fair access to basic healthcare should not depend on where a person happens to live.','fair access to','公平获得某物的机会','basic healthcare','基本医疗服务']
    ],
    '工作与生活':[
      ['清晰划分工作和休息时间，可以帮助人们避免长期疲惫。','Setting clear boundaries between work and rest can help people avoid persistent exhaustion.','setting clear boundaries','设立清晰边界','persistent exhaustion','持续的疲惫'],
      ['有建设性的反馈能让员工发现不足，同时保持学习的动力。','Constructive feedback helps employees identify areas for improvement while maintaining their motivation to learn.','constructive feedback','建设性反馈','areas for improvement','需要改进的方面'],
      ['选择职业时，个人兴趣和发展机会都值得认真考虑。','When choosing a career, both personal interests and opportunities for development deserve careful consideration.','opportunities for development','发展机会','careful consideration','认真考虑'],
      ['在家办公节省了通勤成本，但也要求更强的自我管理能力。','Working from home reduces commuting costs but also demands stronger self-management skills.','commuting costs','通勤成本','self-management skills','自我管理能力'],
      ['雇主应认可员工的实际贡献，而不是仅仅关注他们在办公室待多久。','Employers should recognise employees’ actual contributions rather than focus solely on the hours they spend in the office.','actual contributions','实际贡献','focus solely on','仅仅关注'],
      ['带薪育儿假可以帮助父母照顾家庭，同时保留职业发展的机会。','Paid parental leave can help parents care for their families while preserving opportunities for career development.','paid parental leave','带薪育儿假','career development','职业发展'],
      ['学习管理金钱能减轻日常压力，并为意外支出做好准备。','Learning to manage money can reduce everyday stress and help people prepare for unexpected expenses.','manage money','管理金钱','unexpected expenses','意外支出'],
      ['真正的休息不只是离开办公桌，也包括暂时放下工作信息。','Meaningful rest involves not only leaving the desk but also stepping away from work-related messages.','stepping away from','暂时远离','work-related messages','工作相关的信息'],
      ['稳定的工作固然重要，但人们也需要感到自己的付出有价值。','Job security matters, but people also need to feel that their efforts are valued.','job security','工作稳定性','their efforts are valued','他们的付出受到重视']
    ],
    '文化与社会':[
      ['社区活动能让不同背景的居民建立联系，减少彼此的隔阂。','Community activities can bring residents from different backgrounds together and reduce social barriers.','different backgrounds','不同背景','social barriers','社会隔阂'],
      ['博物馆可以运用互动展示，让历史与年轻观众产生联系。','Museums can use interactive displays to make history more relevant to younger audiences.','interactive displays','互动展示','relevant to','与某人或某事相关的'],
      ['公共空间的设计应考虑老人、儿童和行动不便者的需求。','The design of public spaces should take account of the needs of older people, children and those with limited mobility.','public spaces','公共空间','limited mobility','行动不便'],
      ['保留地方语言有助于保护代代相传的知识和传统。','Keeping local languages alive helps preserve knowledge and traditions passed down through generations.','keeping local languages alive','让地方语言保持活力','passed down through generations','代代相传的'],
      ['社交媒体可以放大少数人的声音，但也可能让偏见传播得更快。','Social media can amplify underrepresented voices, but it can also allow prejudice to spread more rapidly.','underrepresented voices','较少被听见的声音','prejudice','偏见'],
      ['艺术教育让学生有机会从不同的角度理解世界。','Arts education gives students opportunities to understand the world from different perspectives.','arts education','艺术教育','different perspectives','不同视角'],
      ['尊重传统并不意味着拒绝改变，而是理解哪些价值值得保留。','Respecting tradition does not mean rejecting change but understanding which values are worth preserving.','respecting tradition','尊重传统','worth preserving','值得保留的'],
      ['邻里之间的小小帮助，可以逐渐建立更强的信任感。','Small acts of help between neighbours can gradually build a stronger sense of trust.','small acts of help','小小的帮助','a stronger sense of trust','更强的信任感'],
      ['讨论社会问题时，倾听不同经历往往比急于下结论更有价值。','When discussing social issues, listening to different experiences is often more valuable than rushing to conclusions.','social issues','社会问题','rushing to conclusions','急于下结论']
    ]
  };
  const bank=Object.fromEntries(Object.entries(rows).map(([topic,items])=>[topic,items.map(([chinese,reference,first,firstDef,second,secondDef])=>[chinese,reference,{word:first,pos:'phrase',def:firstDef,example:reference},{word:second,pos:'phrase',def:secondDef,example:reference}])]));
  if(typeof module==='object'&&module.exports)module.exports=bank;else root.PassetsQuestionBank=bank;
})(typeof window!=='undefined'?window:globalThis);
