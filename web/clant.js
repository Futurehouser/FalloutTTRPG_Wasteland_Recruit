// Clant Westwood's lines for Talking Heads (English; Spanish lives in lang_es.js). Generated from a
// dialogue source file, same shape as Elber's DATA in elber.js. HURT entries also say how much damage.
const CLANT_DATA = {
 "GREET": {
  "human": [
   "Ah, a customer. Come in, come in, mind the bottle caps on the floor. Clant Westwood, merchant, at your service, {name}. Whatever you need, I have it. Whatever I don't have, you don't need.",
   "Don't stare at the nose, {name}. It left in 2077 and never wrote back. Now, what can old Clant do for you today?"
  ],
  "ghoul": [
   "Well, well. A fellow survivor of the long afternoon. Sit down, {name}. Ghouls get the family discount. It's the same price, but I say it warmly.",
   "{name}! Finally, a face with character. Literally. Come, come, let's talk business like civilized corpses."
  ],
  "mutant": [
   "My, what a magnificent specimen. Mind the doorframe, {name}. I have just the thing for a customer of your... stature.",
   "A super mutant with manners, I hope, {name}? Good. Manners are the one thing the bombs couldn't melt. Well, mine, at least."
  ],
  "robot": [
   "A robot! Please, {name}, don't tell Elber you came to me first. He gets jealous, and then he gets loud.",
   "Welcome, {name}. I don't judge a customer by their chassis. I judge them by their caps. Very democratic, really."
  ]
 },
 "PLAIN": [
  {
   "ask": "Who are you?",
   "say": [
    "Clant Westwood, dealer in fine goods, rare finds and things nobody else will admit they need. Before that, a star. Before that, a nose."
   ],
   "next": [
    {
     "ask": "A star? You were an actor?",
     "say": [
      "The smiling kid on every bottle of Sunset Sarsaparilla, my friend. That grin sold millions. The grin's still here. The face around it took a holiday."
     ]
    }
   ]
  },
  {
   "ask": "What else did you act in?",
   "say": [
    "Commercials for H&H Tools. Commercials for Mr. House's vacation resort and country club. Tragic, isn't it? I sold paradise, and then it got cancelled."
   ],
   "next": [
    {
     "ask": "Was that your biggest role?",
     "say": [
      "No. I played the Silver Shroud in a pilot for Hubris Comics. My finest work. It was going to air the week of the bombs. Talk about a tough audience."
     ]
    }
   ]
  },
  {
   "ask": "How did you survive the bombs?",
   "say": [
    "No Vault would have me. So I climbed inside a lead-lined Nuka-Cola fridge and closed the door. It turned a quick death into a very long life. I'm still deciding if it was a bargain."
   ],
   "next": [
    {
     "ask": "What happened to you afterwards?",
     "say": [
      "The radiation came in slowly, like a polite guest. First the hair, then the color, then the nose. But my eyes got sharper and my grip stronger. Every bad deal has a silver lining."
     ]
    }
   ]
  },
  {
   "ask": "Doesn't the radiation hurt?",
   "say": [
    "Hurt? My dear, a good dose of rads is my morning coffee. The more the Wasteland glows, the better I feel. It's the one thing out here that's on my side."
   ]
  },
  {
   "ask": "How did you become a merchant?",
   "say": [
    "An actor knows what people want before they do. I found jewels in the junk, sold them with a smile, and called it a career. A stall, then a caravan, then the whole Wasteland."
   ]
  },
  {
   "ask": "How did you meet Elías Crow?",
   "say": [
    "Raiders hit my caravan. Everyone fell. I was behind a cart with half a magazine in my nine millimeter. Then, from far away, one shot. Then another. Then silence. Then Elías."
   ],
   "next": [
    {
     "ask": "And you've worked together ever since?",
     "say": [
      "A fine partnership. I bring the caps, he keeps me breathing. Well, figuratively. Neither of us breathes much anymore."
     ]
    }
   ]
  },
  {
   "ask": "What do you think of Elías?",
   "say": [
    "Elías Crow is the finest shot in the Mojave and the worst conversationalist. He saved my life. I owe him everything, which is why I never charge him for coffee.",
    "People think Elías is cold. He isn't. He's just saving his words, like caps. When he does speak, listen. It's usually 'down'."
   ]
  },
  {
   "ask": "What do you think of Elber Gotas 3000?",
   "say": [
    "Elber is a walking catalog of insults with a fusion core. He calls me rotten. I call him inventory. We have a wonderful working relationship.",
    "He wants to free every robot in the Wasteland and charge them a membership fee. Honestly? I'm a little proud of him."
   ]
  },
  {
   "ask": "And Jack Rose?",
   "say": [
    "Jack is a raider. Raiders killed my caravan. So I keep Jack close, the way you keep a rattlesnake in a box: carefully, and with a profit in mind.",
    "Jack sold me his laser gatling for two hundred caps and a stew. I sold it for six hundred. He still hasn't forgiven me. He also still hasn't learned arithmetic."
   ],
   "next": [
    {
     "ask": "Aren't you afraid of him?",
     "say": [
      "Of Jack? He shouts at a cactus for looking at him. No, my friend. I'm afraid of quiet men. Jack has never been quiet a day in his life."
     ]
    }
   ]
  },
  {
   "ask": "And Dr. Thobias?",
   "say": [
    "A true gentleman. He treated my skin without once wincing. People who look past this face get my loyalty for life. And I have a very long life."
   ]
  },
  {
   "ask": "Why do you travel with this group?",
   "say": [
    "Wealth, my friend. And because without me, they would have been shot at every town gate between here and the Dam. Elber insults, Jack threatens, Crow stares. I talk. Somebody has to."
   ],
   "next": [
    {
     "ask": "Has your charm really saved them?",
     "say": [
      "Last month in Primm, Jack called the sheriff a 'tin star'. I called it a misunderstanding, sold the sheriff a pocket watch, and we left with supplies. That's a Tuesday."
     ]
    }
   ]
  },
  {
   "ask": "Why are you so polite?",
   "say": [
    "Because the world ended and the manners didn't have to. Courtesy is the best armor out here. Raiders expect fists. Nobody knows what to do with a 'please'."
   ]
  },
  {
   "ask": "Do people treat you badly for being a ghoul?",
   "say": [
    "Oh, constantly. 'Zombie', 'rotface', 'walking corpse'. I just smile and add ten percent to their bill. Prejudice is very good for business."
   ]
  },
  {
   "ask": "Do you ever cheat your customers?",
   "say": [
    "Only the ones who deserve it. Honest folk get honest prices. Bigots, bullies and NCR quartermasters get creative ones."
   ]
  },
  {
   "ask": "What's for sale today?",
   "say": [
    "A pre-War toaster, slightly haunted. A deck of cards, fifty-one of them. And a lovely bottle of Sunset Sarsaparilla, with my face on it. Signed, for a small extra.",
    "Today? A gas mask that only smells a little of the previous owner, three Stimpaks, and an excellent opportunity. The opportunity costs extra."
   ]
  },
  {
   "ask": "What's the best deal you ever made?",
   "say": [
    "I sold a Brotherhood scribe a 'pre-War data module'. It was a radio knob. He thanked me. He wrote a paper on it. I'm cited."
   ],
   "next": [
    {
     "ask": "Didn't you say you only cheat those who deserve it?",
     "say": [
      "He'd confiscated a family's water purifier for 'safekeeping' the day before. The knob was a bargain, considering."
     ]
    }
   ]
  },
  {
   "ask": "Do you miss the old world?",
   "say": [
    "Every day. The cocktail parties. The applause. Having a face that didn't make children cry. Still, the old world never let me own my own shop."
   ]
  },
  {
   "ask": "What do you think of Mr. House?",
   "say": [
    "I filmed ads for his resort, you know. He never once came to set. Two hundred years later he still hasn't. Some men are born producers."
   ]
  },
  {
   "ask": "Have you been to the Strip?",
   "say": [
    "Many times. The Securitrons don't care what your face looks like, as long as your credit is good. Finally, a city that judges people properly."
   ]
  },
  {
   "ask": "What about the NCR?",
   "say": [
    "Lovely customers. They pay in paper money, which is like paying in promises. I accept promises. At a rate."
   ]
  },
  {
   "ask": "And Caesar's Legion?",
   "say": [
    "They don't buy anything, they just take it, and they don't like my kind. I sell them nothing, and I sell their enemies everything. That's how I do politics."
   ]
  },
  {
   "ask": "Is there a ghoul community out here?",
   "say": [
    "Some ghouls went to the stars, or tried, at the REPCONN test site. Lovely people. Terrible travel agents. I'll stay on the ground, with the customers."
   ]
  },
  {
   "ask": "Are you afraid of becoming feral?",
   "say": [
    "Every ghoul is. That's why I keep my mind busy: prices, accents, old scripts. A man who's still haggling is a man who's still himself."
   ]
  },
  {
   "ask": "Can you still act?",
   "say": [
    "Watch. 'Sunset Sarsaparilla: the taste of the Old West!' ...Ah, the grin still works. Children still run away, but now for different reasons."
   ]
  },
  {
   "ask": "Why the hat and the suit?",
   "say": [
    "A merchant is a performance, my friend. The suit says trust me. The hat says I've seen things. The gloves say nothing at all, and that's best for everyone."
   ]
  },
  {
   "ask": "Do you take NCR dollars or caps?",
   "say": [
    "Both. And Legion denarii, melted down. And pre-War money, for the collectors. And favors, for friends. I am a very open-minded man."
   ]
  },
  {
   "ask": "What's your secret to haggling?",
   "say": [
    "Patience. I've been waiting two hundred years, my friend. I can wait for you to blink."
   ]
  },
  {
   "ask": "Tell me a joke.",
   "say": [
    "Why don't ghouls ever win at poker? Because we keep losing face. Oh, come now. I've had two centuries to work on that one.",
    "A raider walks into my shop and says: 'Give me all your caps.' I say: 'Certainly, sir, that will be twenty caps.' He paid. Jack still doesn't know what happened."
   ]
  },
  {
   "ask": "I should go.",
   "say": [
    "Of course, of course. Before you go, may I interest you in a slightly used compass? No? Then stay a while, and I'll think of something else.",
    "The door is right there. Mind you, Jack is right behind it, and he's in one of his moods. I'd stay for one more cup, if I were you."
   ]
  },
  {
   "ask": "Can I work for you?",
   "say": [
    "Possibly. The pay is a percentage of what you sell, the hours are all of them, and the dental plan is a pair of pliers. When can you start?"
   ]
  },
  {
   "ask": "Do you have family?",
   "say": [
    "I had a sister in Reno. Two hundred years is a long time to wait for a letter. Now I have Elías, a robot, a raider and a doctor. Family is what survives with you."
   ]
  },
  {
   "ask": "What do you think of Vaults?",
   "say": [
    "I applied to three. They said the list was full. I've since visited two of them. The list is very empty now. I don't gloat. Much."
   ]
  },
  {
   "ask": "Are you rich?",
   "say": [
    "Rich is a feeling, my friend. Right now I feel about four thousand caps rich, spread across six hidden stashes, nine debts and one very trusting brahmin."
   ]
  },
  {
   "ask": "Have you ever been robbed?",
   "say": [
    "Once. The thief came back a week later to apologize and buy a hat. I'm told I have that effect on people."
   ]
  },
  {
   "ask": "What would you do with a fortune?",
   "say": [
    "Buy a theater, restore it, and put on the Silver Shroud pilot, at last. Two hundred years late. Opening night, free seats for anyone who never called me a zombie."
   ]
  }
 ],
 "TESTS": [
  {
   "s": "STR",
   "n": 6,
   "ask": "I'll carry that crate of stock for you.",
   "ok": "Splendid. Gently, please, that's pre-War china. Well, pre-War. Well, china-adjacent. Thank you, my friend.",
   "bad": "You dropped it. On my foot, which I can't feel, thankfully. The china, sadly, felt everything. That will go on your tab."
  },
  {
   "s": "STR",
   "n": 7,
   "ask": "Shake my hand, Clant. A real handshake.",
   "ok": "Now THAT is a handshake. Firm, honest, and you didn't wipe your hand afterwards. You have no idea how rare that is.",
   "bad": "Ah. I may have squeezed a bit hard. Ghoul grip, you understand. The fingers will straighten in a day or two."
  },
  {
   "s": "STR",
   "n": 8,
   "ask": "I can push the caravan wagon out of the mud alone.",
   "ok": "Out it comes! The brahmin looks embarrassed. So does Jack. Marvelous. You've just earned a discount and two enemies.",
   "bad": "The wagon is now deeper, and so are you. Don't struggle, my friend. Elías will fetch a rope. Eventually."
  },
  {
   "s": "STR",
   "n": 5,
   "ask": "Let me hold the door for you, Mr. Westwood.",
   "ok": "Mister Westwood! And the door! Oh, you've made an old ghoul very happy. Manners and muscles. A rare combination.",
   "bad": "The door was heavier than your intentions, I see. It's fine. The thought is what counts. And the bruise."
  },
  {
   "s": "PER",
   "n": 6,
   "ask": "That ring you're selling has a fake stone.",
   "ok": "Sharp eyes! Glass, I'm afraid. I was saving it for someone who deserved it. Not you. You get the real one. Same price.",
   "bad": "That is a genuine pre-War ruby, and you have just insulted it. And me. And my mother, who gave it to me. Twenty caps more."
  },
  {
   "s": "PER",
   "n": 7,
   "ask": "Someone's following the caravan. Three of them, behind the rocks.",
   "ok": "Raiders. I'd know that shuffle anywhere. Well spotted, my friend. Elías, if you'd be so kind... And there's the shot. Thank you.",
   "bad": "Those are three Joshua trees, my friend. They've been following the caravan since before the War. At a very respectful distance."
  },
  {
   "s": "PER",
   "n": 8,
   "ask": "You're counting caps behind your back, Clant.",
   "ok": "You saw that? Two hundred years of practice, and you saw that. I'm impressed, and a little frightened. Here, a cap for your silence.",
   "bad": "My hands are right here, my friend, folded like a gentleman's. Your purse, on the other hand... no, I'm joking. Mostly."
  },
  {
   "s": "PER",
   "n": 5,
   "ask": "That's Sunset Sarsaparilla. I can smell it from here.",
   "ok": "A nose for quality! Ironic, coming from me. Have a sip, on the house. My face is on the bottle. Our faces, rather. I aged; it didn't.",
   "bad": "That's turpentine, my friend. For the boots. Please, don't drink the next thing you smell."
  },
  {
   "s": "END",
   "n": 6,
   "ask": "I'll drink that irradiated water. I'm tougher than I look.",
   "ok": "Bottoms up, and you're still standing. You'd make a fine ghoul one day. I mean that as the highest compliment.",
   "bad": "Ah. You're turning a color I remember from my own early days. Sit down. Breathe. Welcome to the club, almost."
  },
  {
   "s": "END",
   "n": 7,
   "ask": "I can sit through your whole Silver Shroud performance.",
   "ok": "All forty minutes! Including the death scene, which runs eleven. You are the audience I deserved in 2077.",
   "bad": "You fell asleep in the first act. The bombs had better timing. Still, critics have been crueler."
  },
  {
   "s": "END",
   "n": 8,
   "ask": "Let's walk through that rad storm together.",
   "ok": "A stroll in the glow with a friend! I feel twenty years younger. You look twenty years older, but you're standing. Bravo.",
   "bad": "You collapsed halfway, my friend. I carried you, and I won't even charge for it. This time. Here, RadAway. That I'll charge for."
  },
  {
   "s": "END",
   "n": 5,
   "ask": "I'll try your famous ghoul stew.",
   "ok": "You finished the bowl! Elías won't touch it, and he eats lizards raw. You have the stomach of a businessman.",
   "bad": "Too much, too soon. The secret ingredient is time. About two hundred years. Bucket's over there."
  },
  {
   "s": "CHA",
   "n": 6,
   "ask": "Give me a fair price, Clant. One friend to another.",
   "ok": "One friend to another... you've said the magic words. Fair price it is. Don't tell Jack, he'd faint.",
   "bad": "My friends call me Clant. My customers call me 'sir'. I'm afraid you're still a customer, sir."
  },
  {
   "s": "CHA",
   "n": 7,
   "ask": "You were the best part of every Sunset Sarsaparilla ad.",
   "ok": "You remember! Oh, you've made my week. My decade. Here, have a bottle cap from the original run. Star caps are worth a fortune.",
   "bad": "Flattery from someone who wasn't born yet. I can smell it, and I don't even have a nose. Try again with more conviction."
  },
  {
   "s": "CHA",
   "n": 8,
   "ask": "Let me handle the next town guard. You can watch.",
   "ok": "Gates open, guard smiling, Jack's knife still in its sheath. Magnificent. I may have to raise my prices to compete with you.",
   "bad": "And now the guard is pointing a rifle at all of us. Step back, please, my friend. Officer! What a splendid hat..."
  },
  {
   "s": "CHA",
   "n": 5,
   "ask": "You look tired, Clant. Long day?",
   "ok": "Two hundred years long, my friend. But kind of you to ask. Kindness is the rarest thing I've ever been offered, and I've been offered a Deathclaw egg.",
   "bad": "Tired? I always look like this. This is my rested face. Thank you for reminding me."
  },
  {
   "s": "INT",
   "n": 6,
   "ask": "This 'pre-War' radio has a postwar fuse in it.",
   "ok": "Busted. Yes, Elber fixed it with a Wasteland fuse. I'll knock fifteen percent off for your trouble, and your intelligence.",
   "bad": "That's the volume knob, my friend. Lovely enthusiasm, though. Please don't open anything else."
  },
  {
   "s": "INT",
   "n": 7,
   "ask": "Your ledger doesn't add up. You owe Jack forty caps.",
   "ok": "...So I do. Honor is honor, even with raiders. Please, give him these. And don't tell him it was an error. Tell him it was a gift.",
   "bad": "You've added the date to the total, my friend. Jack would be very excited to hear your math, though. Please don't tell him."
  },
  {
   "s": "INT",
   "n": 8,
   "ask": "Buy water in Novac and sell it in Nipton. Triple profit.",
   "ok": "A trade route! You think like a merchant. I've been looking for a partner with brains. Elías has aim and Jack has volume.",
   "bad": "Nipton was burned to the ground by the Legion, my friend. Nobody's buying water. Not even the ghosts."
  },
  {
   "s": "INT",
   "n": 5,
   "ask": "Three caps plus four caps is seven caps.",
   "ok": "Correct. You'd be shocked how many people get that wrong. Mostly Jack. Mostly on purpose.",
   "bad": "You said eight, my friend. I accept, of course. Eight it is. Thank you for your business."
  },
  {
   "s": "AGI",
   "n": 6,
   "ask": "I'll catch the bottle before it hits the floor.",
   "ok": "Caught! And it's a signed Sunset Sarsaparilla. You just saved forty caps and an old man's heart.",
   "bad": "And there it goes. Signed, too. I'll add it to your account under 'tragedies'."
  },
  {
   "s": "AGI",
   "n": 7,
   "ask": "Bet I can take your hat without you noticing.",
   "ok": "My hat! I didn't feel a thing. Mind you, I don't feel much these days. Still. Impressive. Give it back, please, it's load-bearing.",
   "bad": "You're holding my hand, my friend, not my hat. It's a lovely gesture, but my rates for hand-holding are steep."
  },
  {
   "s": "AGI",
   "n": 8,
   "ask": "I can dodge Jack's molotov if he throws one.",
   "ok": "Not a singe! Jack is furious. I've sold tickets. Would you mind doing it again in ten minutes? I have a waiting list.",
   "bad": "You dodged into it, my friend. Roll, please. Roll. Excellent. Burn ointment is in the third drawer, very reasonably priced."
  },
  {
   "s": "AGI",
   "n": 5,
   "ask": "I'll step around the broken glass, don't worry.",
   "ok": "Like a dancer. I once danced in a commercial, you know. Your footwork is better. Don't tell anyone I said so.",
   "bad": "You didn't, did you? Sit, sit. I'll get the tweezers. And the bill."
  },
  {
   "s": "LCK",
   "n": 6,
   "ask": "Let me pick a mystery box from your shelf.",
   "ok": "The one with the Stimpaks! Nobody ever picks that one. I'm almost glad. Almost.",
   "bad": "A box of... spoons. Bent ones. Elber's. He'll want them back. Good luck with that."
  },
  {
   "s": "LCK",
   "n": 7,
   "ask": "Flip a cap: heads, I get it half price.",
   "ok": "Heads. Well, a deal's a deal, and Clant Westwood keeps his word. Half price. I'll cry about it later, privately.",
   "bad": "Tails. Full price, then. Plus a small fee for the coin toss. Entertainment isn't free, my friend."
  },
  {
   "s": "LCK",
   "n": 8,
   "ask": "Let me guess which pocket the good stuff is in.",
   "ok": "Inside left. How...? No one knows about the inside left. Not even Elías. Here, take a piece, and forget where it came from.",
   "bad": "That one's full of my old teeth, my friend. Keepsakes. Would you like one? They're very lucky. Well, not for me."
  },
  {
   "s": "LCK",
   "n": 5,
   "ask": "Maybe today you'll give me something for free.",
   "ok": "Today, of all days, you're right. A free bottle cap. Enjoy it. It's the only free thing I've given since 2077.",
   "bad": "Free? Ha. Even my advice costs a cap. And that was advice. That'll be one cap."
  },
  {
   "p": "Junktown Jerky Vendor",
   "r": 1,
   "ask": "Let's haggle. Vendor to vendor.",
   "ok": "Oh, a professional! Fair prices, quick deals, no theater. Well, a little theater. Let's do business, colleague.",
   "bad": "You opened with your final offer. Never open with your final offer. Lesson one, and it cost you fifty caps."
  },
  {
   "p": "Cap Collector",
   "r": 1,
   "ask": "I know what this stuff is really worth, Clant.",
   "ok": "Then you know I've been generous. Mostly. Fine, ten percent off, and my respect, which is worth more.",
   "bad": "You valued a fusion core at two caps. I'll buy every one you've got, at that price."
  },
  {
   "p": "Smooth Talker",
   "r": 1,
   "ask": "You and I both know charm is the real currency out here.",
   "ok": "A kindred spirit. I'd tell you all my tricks, but you clearly have your own. Shall we never compete?",
   "bad": "Charm, yes. Yours, sadly, is counterfeit. Like that coin you just tried to pass me."
  },
  {
   "p": "Scrounger",
   "r": 1,
   "ask": "I found this in the ruins. Want it?",
   "ok": "A working pre-War camera! You have the gift, my friend. You see jewels in junk, like I used to. Name your price.",
   "bad": "A brick. You found a brick. I've got six hundred of them, and they're all better."
  },
  {
   "p": "Scoundrel",
   "r": 1,
   "ask": "Elías says you're his best friend.",
   "ok": "He... said that? Out loud? Elías? You're lying, of course, but beautifully, and I'll treasure it anyway.",
   "bad": "Elías has said nine words this year, and none of them was 'friend'. Do try harder, my friend."
  },
  {
   "p": "Rad Resistance",
   "r": 1,
   "ask": "Let's have tea by the glowing pond.",
   "ok": "How civilized! And you don't even flinch at the glow. You'd have been welcome at my parties.",
   "bad": "Your hair's falling into your tea, my friend. Welcome to the first stage. Don't worry, the nose takes years."
  },
  {
   "p": "Inspirational",
   "r": 1,
   "ask": "Let me give the group a speech before the next job.",
   "ok": "Jack cheered. Elber took notes. Elías nodded. Nodded! I haven't seen that in years. Bravo.",
   "bad": "Jack fell asleep, Elber corrected your grammar and Elías left. Leave the speeches to the professionals."
  },
  {
   "p": "Night Person",
   "r": 1,
   "ask": "I'll keep watch with you tonight.",
   "ok": "Sharp as an owl at midnight. Good. Ghouls don't sleep much, and it's nice to have company that doesn't snore. Unlike Jack.",
   "bad": "You were asleep in five minutes, my friend. Snoring in harmony with Jack. A duet I'll never forget."
  },
  {
   "p": "Pickpocket",
   "r": 1,
   "ask": "Check your pockets, Clant.",
   "ok": "My lucky cap! My pocket watch! My spare ear! You're good. You're very good. Give them back, and you're hired.",
   "bad": "You tried, my friend. I felt nothing, but I saw everything. My pockets are fine. Yours, however..."
  },
  {
   "p": "Mysterious Stranger",
   "r": 1,
   "ask": "Have you ever met a man in a trench coat who appears and vanishes?",
   "ok": "Ah. You've seen him too. He bought a hat from me once and paid in exact change. Nobody pays in exact change. Unsettling man.",
   "bad": "A trench coat? That's me, my friend, at dusk, from behind. People talk."
  },
  {
   "p": "Lead Belly",
   "r": 1,
   "ask": "I'll taste-test your canned goods from 2077.",
   "ok": "Not even a hiccup! You'd be the perfect food taster. The pay is terrible, but the risks are spectacular.",
   "bad": "Ah. That was a 2076 can. A bad year. The bucket, please."
  },
  {
   "p": "Chem Resistant",
   "r": 1,
   "ask": "Sell me some Jet. I can handle it.",
   "ok": "You can, can't you? Steady hands, clear eyes. Very well, but only one. Clant Westwood doesn't sell ruin, only fun.",
   "bad": "That's what they all say. No, my friend. I don't sell chems to people who are already shaking. Here, water instead. Free."
  }
 ],
 "OWN_PERK": {
  "ask": "Let me show you a talent of mine.",
  "ok": [
   "{perk}. Splendid. A man of talents is a man of value, and I appreciate value. Let's talk about a partnership.",
   "Oh, {perk}! I knew there was something special about you. I'm rarely wrong about people. Only about stocks."
  ]
 },
 "ASIDES": [
  "Elías, would you stop pointing that rifle at the customers? Thank you.",
  "Jack! Put the merchandise down! Those are not molotov bottles!",
  "Elber is calling me 'rotting inventory' again. He's in a good mood, then.",
  "Dr. Thobias sends his regards. He's the only one here with manners besides me.",
  "Excuse me, my ear is loose. Ah, there. Where were we?",
  "Business tip: always smile. Especially when you're missing lips.",
  "Jack keeps asking about his gatling. I keep changing the subject. To money.",
  "Elías just shot a gecko three hundred meters away. Dinner is served.",
  "The light catches my face just right here. Old habits.",
  "Elber offered to buy my shop for forty-one caps and a toaster coupon. Adorable.",
  "Jack is counting on his fingers again. He's run out of fingers.",
  "I smell rain. Or radiation. With me, it's hard to tell the difference.",
  "Somewhere, a Sunset Sarsaparilla bottle is smiling with my face. That keeps me going.",
  "Elías nodded at me this morning. I think we're getting closer."
 ],
 "HURT": [
  {
   "d": 1,
   "t": "He grips your shoulder with surprising ghoul strength. You lose 1 HP. \"Ah, forgive me. I forget my own strength.\""
  },
  {
   "d": 2,
   "t": "A shot from Elías cracks the ground right at your feet and a rock chip hits you. You lose 2 HP. \"He's protective. I did warn you.\""
  },
  {
   "d": 1,
   "t": "He raps your knuckles with his cane. You lose 1 HP. \"Manners, my friend. Manners.\""
  },
  {
   "d": 1,
   "t": "He hands you a 'complimentary' drink that is mostly radiation. You lose 1 HP. \"Delicious for me. An acquired taste for you.\""
  },
  {
   "d": 2,
   "t": "He lets the lid of a heavy strongbox drop on your hand. You lose 2 HP. \"Oh dear. That box bites. It's in the fine print.\""
  },
  {
   "d": 1,
   "t": "He steps aside as you lean on the counter, and you fall onto broken glass. You lose 1 HP. \"The counter is for paying, not leaning.\""
  }
 ],
 "EULOGY": {
  "fall": [
   "And so {name} exits, stage left. Not my best audience, but a loyal one. Elías, a hat off, please. Jack, put the boots DOWN.",
   "Oh dear. {name} has left us. I'll keep the account open, out of respect. And because they still owe me twelve caps.",
   "{name} is gone. Two hundred years, and it never gets easier. Well, it gets a little easier. Doctor! If you have a moment...",
   "Rest well, {name}. The Wasteland takes everyone eventually. Except me, apparently. Jack, I saw that. Put it back."
  ],
  "boom": [
   "{name} has come apart. My condolences. And my offer: I'll buy the parts at a fair price. Elber, don't you dare outbid me.",
   "A sad day for machines everywhere. Elber will be inconsolable, then he'll start a fund. I'll manage the fund."
  ]
 },
 "REVIVE": {
  "ask": "Ask Dr. Thobias to help {name}.",
  "say": [
   "The doctor works his miracles, and {name} returns. Welcome back, my friend. The Stimpak is on the house. The bandages are not.",
   "{name} lives! Bravo, Doctor. Take a bow, my friend. You've just had the most dramatic return since my comeback tour."
  ]
 },
 "GHOST": [
  {
   "ask": "Lie there in silence.",
   "say": [
    "A good audience at last. Quiet, attentive and not haggling."
   ]
  },
  {
   "ask": "Haunt the shop.",
   "say": [
    "A chill in the shop. Splendid. A haunted shop sells twice as many candles."
   ]
  },
  {
   "ask": "Whisper from the beyond: \"Refund.\"",
   "say": [
    "No refunds, my friend. Not in life, and certainly not after it."
   ]
  },
  {
   "ask": "Let Clant go through your pockets.",
   "say": [
    "I'm only taking what you owed me. And a little interest. And the hat, for sentimental reasons."
   ]
  },
  {
   "ask": "Stare at him with dead eyes.",
   "say": [
    "Ah, the dead stare. I've had it for two hundred years. Yours needs practice."
   ]
  },
  {
   "ask": "Wait for a miracle.",
   "say": [
    "I'm out of miracles, but I have a lovely selection of funerals. Very affordable."
   ]
  }
 ]
};
