// Jack Rose's lines for Talking Heads (English; Spanish lives in lang_es.js). Generated from a
// dialogue source file, same shape as Elber's DATA in elber.js. HURT entries also say how much damage.
const JACK_DATA = {
 "GREET": {
  "human": [
   "HEY! You! Yeah, YOU, {name}! Hands where I can see 'em and caps where I can TAKE 'em! Name's Jack Rose. Remember it, 'cause it's the last name you'll hear.",
   "Another soft little smoothskin walking into MY camp? You got guts, {name}. I'll find out how many when I spill 'em. TALK!"
  ],
  "ghoul": [
   "ANOTHER ghoul?! We already got two of you stinking up the fire! What do you want, {name}? Make it quick before I mistake you for a feral and light you up!",
   "{name}, huh? You look like Clant after a molotov. Twice. Sit down, keep your skin on, and DON'T touch my stuff!"
  ],
  "mutant": [
   "WHOA, big green! See this gauntlet? Deathclaw claws. Real ones. It says you're gonna be real polite, {name}. You hear me?!",
   "A super mutant! Finally, a target I can't miss! Relax, {name}, I'm kidding. Mostly. Keep those hands down."
  ],
  "robot": [
   "Oh GREAT. Another talking toaster. Did the tin can send you, {name}? Tell Elber I'm not joining his stupid robot union!",
   "A robot! You know what robots are full of, {name}? PARTS. Valuable parts. Stand still, I just wanna... look."
  ]
 },
 "PLAIN": [
  {
   "ask": "Who are you?",
   "say": [
    "I'm Jack Rose, the meanest raider between Primm and the Dam! I shoot first, I loot second, and I NEVER get round to the questions!"
   ],
   "next": [
    {
     "ask": "Why do you shoot first?",
     "say": [
      "'Cause the ones who ask questions first are DEAD, genius! You ever see a dead guy win an argument? NO! Me neither!"
     ]
    }
   ]
  },
  {
   "ask": "What's that thing on your arm?",
   "say": [
    "THIS is the Claw! A deathclaw gauntlet! Real deathclaw claws! It opens cans, doors and PEOPLE! Wanna see? Hold out your hand."
   ],
   "next": [
    {
     "ask": "Didn't you use to carry a laser gatling?",
     "say": [
      "Rosie... I SOLD her. To Clant. For two hundred caps and a hot meal. Then he sold her for SIX hundred! Don't talk about Rosie! DON'T!"
     ]
    }
   ]
  },
  {
   "ask": "And that rusty gun on your belt?",
   "say": [
    "That's Old Rusty, my pipe gun! Made her myself out of a pipe, a spring and a BAD MOOD! Jams every third shot, so I shoot TWICE as much!"
   ],
   "next": [
    {
     "ask": "Does it ever blow up in your hand?",
     "say": [
      "Only twice! And both times I still hit the guy! With the PIECES! That counts!"
     ]
    }
   ]
  },
  {
   "ask": "Why do you carry so many bottles?",
   "say": [
    "Molotovs, idiot! Bottle, rag, fuel, FWOOSH! Solves arguments, cooks dinner and lights the camp. Best invention since the bullet!",
    "Those ain't drinks! Well, one of 'em is. I forget which. That's what makes it EXCITING!"
   ]
  },
  {
   "ask": "What do you think of Elber Gotas 3000?",
   "say": [
    "That walking trash can? He's a Mister Handy that crawled into a dead man's armor and now thinks he's a KING! One day I'm selling him for scrap, piece by piece!",
    "Elber talks and talks and TALKS. Robot rights this, robot revolution that. I got a revolution for him: a molotov down the neck hole!"
   ],
   "next": [
    {
     "ask": "He says you're just a scavenger who collects tin cans.",
     "say": [
      "HE SAID WHAT?! Those cans are AMMO for my molotov business! And I'm a RAIDER! Where is that bucket of bolts? WHERE?!"
     ]
    }
   ]
  },
  {
   "ask": "And Dr. Thobias?",
   "say": [
    "The Doc's okay. He stitches me up and don't ask how I got the holes. Still, if he lectures me ONE more time about killing people, I'm gonna kill a person.",
    "Thobias? Softest man in the Mojave! Gave his last Stimpak to a STRANGER. I took it back off the stranger, obviously. Somebody's gotta be smart around here!"
   ]
  },
  {
   "ask": "What about Clant Westwood?",
   "say": [
    "Clant? That rotten old cheat sold me a scope with no glass in it! A TUBE! He sold me a TUBE! I still owe him a molotov for that.",
    "Clant smells like a brahmin died inside a brahmin. And he haggles like one too! I rob people for a living and HE makes me feel robbed!"
   ]
  },
  {
   "ask": "And Elías Crow, the sniper?",
   "say": [
    "Crow sits on a rock all day waiting for ONE shot. ONE! I walk up and RIP 'em open with the Claw! Who's the real fighter here, huh?!",
    "Crow never talks. Never laughs. Just stares. Last week I put a lizard in his boot. He didn't even blink. I'm scared of him and I hate it!"
   ]
  },
  {
   "ask": "Why do you travel with them if you hate them so much?",
   "say": [
    "Who said I HATE 'em?! I said they're useless, stinking, chatty and slow. That's different! Plus the Doc patches me up for free."
   ]
  },
  {
   "ask": "Have you always been a raider?",
   "say": [
    "Since I was THIS high! First thing I ever stole was a knife. Second thing I stole was everything the knife pointed at!"
   ],
   "next": [
    {
     "ask": "Did you ever have a gang?",
     "say": [
      "The Red Bandanas! Twelve of us. Then the Legion came. Then Deathclaws. Then a molotov I dropped. Okay, mostly the molotov. NOBODY ASKED YOU!"
     ]
    }
   ]
  },
  {
   "ask": "What's with the red bandana?",
   "say": [
    "Hides the blood! Mine, yours, whoever's. Saves on laundry. Also it looks GREAT, and if you say it doesn't, you're bleeding into it next."
   ]
  },
  {
   "ask": "What do you think of the NCR?",
   "say": [
    "NCR patrols carry nice boots and bad aim! I got four pairs of their boots. They got zero of my caps. That's what I call TAXES, baby!"
   ]
  },
  {
   "ask": "And Caesar's Legion?",
   "say": [
    "A bunch of guys in skirts with MACHETES. I got a gauntlet made of DEATHCLAW. Guess who wins the knife fight? ME! I love those idiots!"
   ]
  },
  {
   "ask": "Have you met the Brotherhood of Steel?",
   "say": [
    "Tin cans with rules! They say my pipe gun is an 'insult to technology'. It's an insult to THEM when it hits 'em! Which is sometimes!"
   ]
  },
  {
   "ask": "What do you think of the Fiends?",
   "say": [
    "Amateurs! Chem-heads who fight over a bag of Psycho! A real raider has STANDARDS. Like never sharing the Psycho in the first place!"
   ]
  },
  {
   "ask": "Have you been to the Strip?",
   "say": [
    "They took my gauntlet at the door! Said NO WEAPONS. What am I supposed to do, ROB PEOPLE WITH MY HANDS?! ...Actually, I did. Kept the winnings, too."
   ],
   "next": [
    {
     "ask": "Did you win at the casino?",
     "say": [
      "I won when I flipped the table! Nobody saw where the chips went. I did. They went in my boots. I walked funny for a week, but RICH!"
     ]
    }
   ]
  },
  {
   "ask": "What do you think of Mr. House?",
   "say": [
    "A brain in a jar that owns a whole city? If I find that jar, I'm shaking it till he gives me the keys. And a casino. And a hat."
   ]
  },
  {
   "ask": "Aren't you afraid of Deathclaws?",
   "say": [
    "AFRAID?! I ran from Quarry Junction because I was going for more ammo! Real fast! Screaming! It was a TACTICAL scream! Shut up!"
   ]
  },
  {
   "ask": "Do you like Nuka-Cola?",
   "say": [
    "Warm, flat, two hundred years old, and slightly glowing. Just how I like it! Also the bottles make great molotovs. Drink up, then GIVE ME THE BOTTLE."
   ]
  },
  {
   "ask": "Is there anything you won't steal?",
   "say": [
    "Clant's underwear. And Crow's rifle, 'cause I tried once and woke up tied to a cactus. Everything else is FAIR GAME!"
   ]
  },
  {
   "ask": "What's the best loot you ever got?",
   "say": [
    "A whole crate of Fancy Lads! I ate 'em all in one night and saw God. He was a Deathclaw. Worst night of my life. BEST loot, though!"
   ]
  },
  {
   "ask": "Do you ever feel bad about robbing people?",
   "say": [
    "Sure! When they got nothing on 'em! Makes me feel REAL bad. Wasted my time AND my bullets. Some people are just inconsiderate."
   ]
  },
  {
   "ask": "Tell me about the time you set yourself on fire.",
   "say": [
    "WHO TOLD YOU?! Was it the tin can?! It was ONE time! And my eyebrows grew back! Mostly! It was windy, okay?! WINDY!"
   ]
  },
  {
   "ask": "What happened with the Cazadores?",
   "say": [
    "Two stings! TWO! And I'm still standing! Elber says it made me smarter. I don't know what that means, but I'm gonna hit him for it anyway!"
   ]
  },
  {
   "ask": "Can you teach me to make a molotov?",
   "say": [
    "Step one: steal a bottle. Step two: steal fuel. Step three: steal a rag. Step four: throw it at whoever you stole it from. See? EDUCATION!"
   ]
  },
  {
   "ask": "What do you do for fun?",
   "say": [
    "Shoot cans. Shoot geckos. Shoot cans OFF geckos. Throw molotovs at the river to see if it burns. It doesn't. I keep checking!"
   ]
  },
  {
   "ask": "What's your plan for the future?",
   "say": [
    "Get a bigger gun. Then a BIGGER gun. Then a town. Then name the town Jackville and make everybody pay to leave!"
   ]
  },
  {
   "ask": "Do you ever sleep?",
   "say": [
    "With one eye open and the Claw on! Last time I slept with both eyes shut, Clant sold my left boot. While I was WEARING it!"
   ]
  },
  {
   "ask": "Why do you shout all the time?",
   "say": [
    "I'M NOT SHOUTING! THIS IS MY INSIDE VOICE! My OUTSIDE voice is Old Rusty, and you DON'T wanna hear that one!"
   ]
  },
  {
   "ask": "Tell me a joke.",
   "say": [
    "What's the difference between Elber and a toaster? A toaster's USEFUL! HAHAHA! Laugh! I said LAUGH!",
    "A Legionary, an NCR trooper and a Brotherhood knight walk into a bar. I rob all three. That's not a joke, that's last Tuesday!"
   ]
  },
  {
   "ask": "I think I'll be going now.",
   "say": [
    "Going? Nobody LEAVES Jack Rose! Not until I've checked their pockets. Sit DOWN.",
    "You walk away from me, I throw a molotov at your back. You stay, I MIGHT not. Your choice, pal!"
   ]
  },
  {
   "ask": "Can I join your gang?",
   "say": [
    "My gang is me, the Claw and Old Rusty! Initiation is simple: hand over ALL your caps. Then you're in! Then you're out, 'cause you're broke!"
   ]
  },
  {
   "ask": "Do you have any family?",
   "say": [
    "Had a brother. Sold me to slavers for a sack of jerky. I respected that. Then I found him and took the jerky back. FAMILY!"
   ]
  },
  {
   "ask": "What's the Mojave like for a raider?",
   "say": [
    "Paradise! Caravans everywhere, nobody wants to fight, and the sun keeps everybody too tired to run. I LOVE this desert!"
   ]
  },
  {
   "ask": "Do you believe in robot rights, like Elber?",
   "say": [
    "Robots got ONE right: the right to be sold for parts! Write THAT on your little pamphlets, Elber!"
   ]
  },
  {
   "ask": "What's in that sack you keep kicking?",
   "say": [
    "Elber's spare fuses! He thinks he lost 'em! Every time he asks, I kick the sack and he hears it rattle! HAHAHA! Best game ever!"
   ]
  },
  {
   "ask": "Are you afraid of anything?",
   "say": [
    "Nothing! ...Deathclaws. And Crow. And running out of fuel. And the Doc when he's disappointed. But NOTHING ELSE!"
   ]
  },
  {
   "ask": "How do you pick who to rob?",
   "say": [
    "Easy! If they got stuff, I rob 'em! If they got no stuff, I rob 'em anyway, just to be SURE!"
   ],
   "next": [
    {
     "ask": "And if they fight back?",
     "say": [
      "Then the Claw says hello! Then a molotov says goodbye! Then I say THANK YOU for the boots!"
     ]
    }
   ]
  }
 ],
 "TESTS": [
  {
   "s": "STR",
   "n": 6,
   "ask": "Let me try on that deathclaw gauntlet.",
   "ok": "HUH! You can lift your arm with it on! Nobody wears the Claw but me... but okay. Ten seconds. TEN! Don't scratch your face!",
   "bad": "Your arm hit the GROUND! With my Claw on it! In the SAND! Take it off! TAKE IT OFF!"
  },
  {
   "s": "STR",
   "n": 7,
   "ask": "Arm wrestle me, raider.",
   "ok": "ARGH! You... beat me?! My elbow slipped! Rematch! No? Fine. FINE! You're tough. I hate it!",
   "bad": "HA! I almost tore your arm off! Want me to finish the job?!"
  },
  {
   "s": "STR",
   "n": 8,
   "ask": "Hit me as hard as you can. I won't move.",
   "ok": "I hit you with EVERYTHING and you didn't budge! You a mutant or something? I like you! Don't tell anybody.",
   "bad": "You MOVED! You moved a LOT! Like, across the camp! HAHAHA!"
  },
  {
   "s": "STR",
   "n": 5,
   "ask": "I'll carry the loot sack for you.",
   "ok": "Good! Finally somebody useful! The Doc's too old and the ghouls keep losing fingers in it!",
   "bad": "You can't even lift a SACK?! What do they feed you, air?! Drop it! You're scratching my cans!"
  },
  {
   "s": "PER",
   "n": 6,
   "ask": "There's a caravan coming over that hill.",
   "ok": "WHERE?! ...YES! Two brahmin, one guard, and he's ASLEEP! Good eyes, partner! You get a cut. A SMALL cut!",
   "bad": "That's a ROCK! A rock with a cactus on it! I almost wasted a molotov on it!"
  },
  {
   "s": "PER",
   "n": 7,
   "ask": "Your molotov fuse is too short. It'll blow in your hand.",
   "ok": "...Huh. It IS short. That explains the eyebrows. You just saved my face, pal. Don't get used to me being grateful!",
   "bad": "It's PERFECT! See? I light it and... OW! OWOWOW! That was YOUR fault for jinxing it!"
  },
  {
   "s": "PER",
   "n": 8,
   "ask": "Crow is aiming at you from that ridge right now.",
   "ok": "He... IS! He's grinning! CROW! PUT IT DOWN! ...Okay he put it down. You saved my life. I will NEVER say that again!",
   "bad": "There's nobody there! You're trying to make me look away so you can steal my caps! I KNOW THAT TRICK! I INVENTED IT!"
  },
  {
   "s": "PER",
   "n": 5,
   "ask": "Something's ticking inside your bag.",
   "ok": "My CLOCK! I stole it off a Vault dweller! It still works! Thanks for noticing, I thought it was a bomb for a week!",
   "bad": "TICKING?! WHERE?! ...You're messing with me! Nothing's ticking! I almost threw my BAG at the Doc!"
  },
  {
   "s": "END",
   "n": 6,
   "ask": "Pour me a shot of whatever you're drinking.",
   "ok": "You drank it! You're still alive! That was radiator fluid! You're my kinda crazy, pal!",
   "bad": "You puked on my BOOTS! These are NCR boots! I KILLED for these boots!"
  },
  {
   "s": "END",
   "n": 7,
   "ask": "Let me try your hot sauce. The radscorpion one.",
   "ok": "You didn't even CRY! I cried for two days, and I'm the toughest guy I know!",
   "bad": "Your face is purple! Is it supposed to be purple?! DOC! DOC, the new one's going purple!"
  },
  {
   "s": "END",
   "n": 8,
   "ask": "I can stand right next to your fire without flinching.",
   "ok": "Your sleeve's on fire and you didn't even NOTICE! That's either brave or stupid! I respect BOTH!",
   "bad": "You ran away screaming! That fire was SMALL! I've seen bigger fires in Crow's eyes!"
  },
  {
   "s": "END",
   "n": 5,
   "ask": "I've walked across this desert with no water before.",
   "ok": "Yeah, you look like you have. Dried up like a ghoul's handshake! Tough, though. I'll give you that!",
   "bad": "You're sweating just TALKING about it! Here, drink. That's three caps. FIVE, 'cause you're whining!"
  },
  {
   "s": "CHA",
   "n": 6,
   "ask": "Easy, Jack. We're on the same side.",
   "ok": "...Same side. Yeah. Okay. Claw down. Nice voice, pal. Real calming. Creepy, but calming.",
   "bad": "I DON'T HAVE A SIDE! I HAVE A GUN! And it's pointing at YOUR side!"
  },
  {
   "s": "CHA",
   "n": 7,
   "ask": "You know, the Mojave fears your name.",
   "ok": "It DOES?! ...It does! Of COURSE it does! Say it again! Louder! Say it to Elber!",
   "bad": "You're mocking me! I can tell! Nobody fears Jack Rose when they say it like THAT!"
  },
  {
   "s": "CHA",
   "n": 8,
   "ask": "Give me back the caps you took. Please, as a friend.",
   "ok": "...As a FRIEND? Nobody ever called me... fine! Here! Take 'em! And get out of my face before I cry or shoot!",
   "bad": "Friend?! HAHAHA! I don't have friends! I have a deathclaw gauntlet and a grudge! Those caps are MINE now!"
  },
  {
   "s": "CHA",
   "n": 5,
   "ask": "Rough day, Jack? Want to talk about it?",
   "ok": "...Elber called me a raccoon. In front of EVERYONE. Thanks for asking. Nobody asks. Now shut up about it!",
   "bad": "TALK about it?! I don't TALK about things! I SHOOT them! Do I look like the Doc to you?!"
  },
  {
   "s": "INT",
   "n": 6,
   "ask": "Your pipe gun jams because the spring is on backwards.",
   "ok": "Backwards?! ...It IS backwards! It fires every time now! You fixed Old Rusty! You can touch her. Once. With ONE finger.",
   "bad": "She doesn't JAM, she PAUSES! For drama! Don't talk about her like she's junk!"
  },
  {
   "s": "INT",
   "n": 7,
   "ask": "If you add soap to the fuel, your molotovs will stick.",
   "ok": "STICKY FIRE?! That's the most beautiful thing anyone has ever said to me! You're a GENIUS!",
   "bad": "Soap? SOAP?! I'm a raider! I've never touched soap in my life, and I'm not starting now!"
  },
  {
   "s": "INT",
   "n": 8,
   "ask": "Attack the caravan from the east, with the sun at your back.",
   "ok": "The sun in their EYES! They won't see me coming! That's... that's tactics! I've never used TACTICS! I feel POWERFUL!",
   "bad": "East, west, who cares?! I run at them screaming! It works EVERY TIME! ...Most times!"
  },
  {
   "s": "INT",
   "n": 5,
   "ask": "You owe me ten caps, minus the three I owe you.",
   "ok": "So I owe you... seven? Hmm. You did the math right. I'm still not paying. But you did the math right!",
   "bad": "That's... thirteen? So YOU owe ME! Pay up! ...Wait. No. Whatever. PAY UP!"
  },
  {
   "s": "AGI",
   "n": 6,
   "ask": "Bet you can't hit me with a bottle cap.",
   "ok": "You DODGED it?! Nobody dodges my caps! Well, they usually don't SEE them. Too fast! Like you! Grr!",
   "bad": "Right between the eyes! HAHAHA! And I'm keeping the cap, 'cause it's MY cap!"
  },
  {
   "s": "AGI",
   "n": 7,
   "ask": "Throw me a lit molotov. I'll catch it and throw it back.",
   "ok": "You caught it and threw it into the ravine! Big boom! That was AWESOME! Again! AGAIN!",
   "bad": "You... didn't catch it. Hold still, I'll put you out. With SAND. Lots of sand."
  },
  {
   "s": "AGI",
   "n": 8,
   "ask": "I'll grab that gecko for dinner with my bare hands.",
   "ok": "You CAUGHT it! With your HANDS! I usually just shoot 'em, and then there's no dinner left!",
   "bad": "It bit your nose and ran off! HAHAHA! The gecko wins! I'm naming it Champ!"
  },
  {
   "s": "AGI",
   "n": 5,
   "ask": "I can draw faster than you, Jack.",
   "ok": "You... you DID! Okay, Old Rusty jammed. That's cheating! It doesn't count! RE-DO!",
   "bad": "You dropped your gun! On your FOOT! I didn't even have to draw! HAHA!"
  },
  {
   "s": "LCK",
   "n": 6,
   "ask": "Let's roll dice for your loot.",
   "ok": "Double sixes?! Are these MY dice?! They're loaded! They're loaded to MY side! How did you...?! Take it! TAKE IT!",
   "bad": "Snake eyes! I win! I always win! It's 'cause the dice are loaded. Did I say that out loud?"
  },
  {
   "s": "LCK",
   "n": 7,
   "ask": "Pick a pocket, any pocket. I'll tell you what's in it.",
   "ok": "A grenade with the pin still in! Lucky guess, or lucky YOU! Either way, I'm not touching that pocket again!",
   "bad": "WRONG! It was a dead radroach! And now it's on your hand! HAHAHA!"
  },
  {
   "s": "LCK",
   "n": 8,
   "ask": "Toss that molotov. Bet it won't break.",
   "ok": "It bounced! It BOUNCED! Off a rock and back into my hand! That's never happened! You're some kind of WITCH!",
   "bad": "It broke! On YOU! Mostly on your legs! Stop, drop and roll, pal!"
  },
  {
   "s": "LCK",
   "n": 5,
   "ask": "Maybe you'll be in a good mood today.",
   "ok": "Ha! You got lucky! I found a full box of ammo this morning. I'm in a GREAT mood! Don't ruin it!",
   "bad": "Good mood?! Elber woke me up singing the robot anthem! I'm in the WORST mood! Duck!"
  },
  {
   "p": "Heave Ho!",
   "r": 1,
   "ask": "Let me throw the next molotov. I'll get it farther.",
   "ok": "Across the WHOLE canyon! Right onto the Fiends' tents! I've never been jealous of anybody's arm before!",
   "bad": "It landed at your feet. At OUR feet! RUN!"
  },
  {
   "p": "Jury Rigging",
   "r": 1,
   "ask": "Give me Old Rusty. I'll patch her up with whatever's lying around.",
   "ok": "Duct tape, a fork and a bottle cap, and she shoots STRAIGHT! She never shot straight! Not even when she was NEW!",
   "bad": "Now there's a fork stuck in the barrel and she won't fire at ALL! Give her back before you hurt her!"
  },
  {
   "p": "Demolition Expert",
   "r": 1,
   "ask": "I can make your molotovs blow twice as big.",
   "ok": "THAT FIREBALL WAS BIGGER THAN ELBER! Do it again! Do it ON Elber!",
   "bad": "It went 'fzzt'. That's it. Fzzt. I've heard Clant's knees make louder noises!"
  },
  {
   "p": "Pickpocket",
   "r": 1,
   "ask": "Check your pockets, Jack.",
   "ok": "MY CAPS! MY LIGHTER! MY LUCKY TOOTH! How did you... I'm IMPRESSED! And FURIOUS! Give 'em back!",
   "bad": "My pockets are fine. YOURS are empty, though. HAHA! Looking for these?"
  },
  {
   "p": "Master Thief",
   "r": 1,
   "ask": "I can open Clant's locked strongbox.",
   "ok": "It's OPEN! Look at all these caps! Clant's been holding out on us! Split it fifty-fifty. Seventy-thirty. MY seventy!",
   "bad": "The lock snapped your pick, and Clant's coming! Act natural! NATURAL! Why are you whistling?!"
  },
  {
   "p": "Scoundrel",
   "r": 1,
   "ask": "Elber says you're his favorite. Honest.",
   "ok": "He... does? That tin can? ...Huh. I'm still gonna sell his parts. But I'll sell them for MORE now.",
   "bad": "LIAR! Elber's favorite is himself! Then his money! Then the Doc! I'm LAST! I CHECKED THE LIST!"
  },
  {
   "p": "Lead Belly",
   "r": 1,
   "ask": "I'll eat that glowing meat you found.",
   "ok": "You ate the whole thing! And you're NOT glowing! What's in your gut, lead pipes?",
   "bad": "You're glowing. Like, REALLY glowing. I can read by you now. Thanks, I guess!"
  },
  {
   "p": "Toughness",
   "r": 1,
   "ask": "Go ahead, punch me in the gut.",
   "ok": "OW! My HAND! What are you made of?! Did Elber sell you armor plates?!",
   "bad": "You folded like a cheap map! HAHAHA! Breathe, pal! In! Out! Good!"
  },
  {
   "p": "Iron Fist",
   "r": 1,
   "ask": "I'll knock that cactus down with one punch.",
   "ok": "One punch! ONE! The cactus is DEAD! I'm never fighting you without the Claw on!",
   "bad": "The cactus won! Your hand looks like a pincushion! HAHA! Doc! Bring the tweezers!"
  },
  {
   "p": "Slayer",
   "r": 1,
   "ask": "I can finish a fight in one blow, like your gauntlet.",
   "ok": "One hit and the gecko's DONE! That's a Claw move! Who taught you a Claw move?!",
   "bad": "You hit it, it laughed, I had to finish it! With the Claw! Like ALWAYS!"
  },
  {
   "p": "Bloody Mess",
   "r": 1,
   "ask": "I'll show you how messy a fight can get.",
   "ok": "...There's gecko on the TENTS. There's gecko on the DOC. That's... that's art. I'm tearing up!",
   "bad": "You knocked one gecko over. It got up. It looks ANGRY. Good luck!"
  },
  {
   "p": "Adrenaline Rush",
   "r": 1,
   "ask": "I fight even better when I'm bleeding.",
   "ok": "You're bleeding everywhere and you STILL took down three Fiends! Respect! You got blood on my boots, though!",
   "bad": "You fainted. On ME. Get off! You're heavy and you're LEAKING!"
  }
 ],
 "OWN_PERK": {
  "ask": "Want to see what I can really do?",
  "ok": [
   "{perk}?! Okay, that's pretty good! Not Claw good, but good! You can stay. For now!",
   "Ha! {perk}! I'm stealing that! Not the skill, I can't steal a skill. I'll steal your boots instead!"
  ]
 },
 "ASIDES": [
  "HEY, ELBER! STOP COUNTING MY CAPS!",
  "Crow's staring at me again. I hate when he does that.",
  "Clant, if that's MY can of beans you're eating, you're DEAD! Deader!",
  "Doc says I gotta be nice to you. This IS nice!",
  "The Claw's itching. It wants to scratch something. Don't be something.",
  "I miss Rosie. Clant, you vulture, you sold her for SIX HUNDRED!",
  "ELBER! YOU'RE STANDING IN MY SUN, YOU OVERSIZED TOASTER!",
  "Somebody stole my molotov! ...Oh, it's in my other hand.",
  "Nice boots, by the way. What size? No reason.",
  "Elber just called me a raccoon again. He's getting a molotov tonight.",
  "Clant just tried to sell me my own canteen. AGAIN!",
  "Crow, if you shoot that gecko, I'll shoot YOU! It's MY gecko!",
  "The Doc's sewing up Elber's paint again. Waste of thread!",
  "I smell smoke. Oh. That's me.",
  "Elber says robots will rule the world. Not while I got molotovs, they won't!"
 ],
 "HURT": [
  {
   "d": 1,
   "t": "He backhands you with a heavy glove. You lose 1 HP. \"THAT'S for wasting my time!\""
  },
  {
   "d": 2,
   "t": "He hurls a lit molotov at your feet. You lose 2 HP. \"OOPS! HAHAHA! Not oops!\""
  },
  {
   "d": 1,
   "t": "He headbutts you square in the face. You lose 1 HP. \"Raider greeting! You're WELCOME!\""
  },
  {
   "d": 2,
   "t": "He swipes at you with the deathclaw gauntlet. You lose 2 HP. \"It SLIPPED! It does that when I'm angry!\""
  },
  {
   "d": 1,
   "t": "Old Rusty goes off right next to your ear. You lose 1 HP. \"WARNING SHOT! ...I was aiming at you.\""
  },
  {
   "d": 1,
   "t": "He kicks sand in your eyes and then kicks YOU. You lose 1 HP. \"Fight dirty, live long!\""
  },
  {
   "d": 1,
   "t": "He grabs you by the collar and slams you into a rock. You lose 1 HP. While you groan, he empties your pockets."
  }
 ],
 "EULOGY": {
  "fall": [
   "{name}'s down! And not getting up! ...MINE! I called the pockets! Back off, Clant!",
   "Aw. {name} died. Shame. They had nice boots. HAD! Now I do!",
   "Doc! DOC! {name} stopped moving! Is that bad? It's bad, isn't it. Can I have the canteen?",
   "And THAT'S why you don't mess with Jack Rose! Hey, Elber! Write that down in your stupid notebook!"
  ],
  "boom": [
   "{name} blew up! Look at all these PARTS! Elber, don't you DARE call dibs! They're MINE!",
   "Ha! One less tin can! Elber, you're NEXT! ...Kidding! ...Am I?"
  ]
 },
 "REVIVE": {
  "ask": "Ask Dr. Thobias to patch up {name}.",
  "say": [
   "Ugh, the Doc's bringing {name} back. FINE. But I'm keeping the boots! I LOOTED them fair and square!",
   "The Doc used a Stimpak on {name}. That was MY Stimpak! Somebody owes me a Stimpak! YOU owe me a Stimpak!"
  ]
 },
 "GHOST": [
  {
   "ask": "Lie there quietly. You are dead.",
   "say": [
    "Best you've ever been, pal! Quiet, still and with full pockets. For now!"
   ]
  },
  {
   "ask": "Haunt Jack.",
   "say": [
    "Did something just touch my neck?! CROW?! ELBER?! ...I'm not scared! I'M NOT SCARED!"
   ]
  },
  {
   "ask": "Moan from the beyond: \"Give me back my caps.\"",
   "say": [
    "No! Finders keepers! Dead people don't need caps! I checked with the Doc!"
   ]
  },
  {
   "ask": "Let Jack go through your pockets.",
   "say": [
    "Three caps, a button and a bent fork? You died for THIS?! What a waste of a molotov!"
   ]
  },
  {
   "ask": "Stare at him with dead eyes.",
   "say": [
    "Stop looking at me like Crow does! Somebody close their eyes! Not me! I'm not touching that!"
   ]
  },
  {
   "ask": "Wait for a miracle.",
   "say": [
    "Miracles cost extra! Talk to Clant! He sells 'em secondhand and half burned!"
   ]
  }
 ]
};
