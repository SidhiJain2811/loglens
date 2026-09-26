# ============================================================================
# 🛡️ LOGLENS RECREATED CODE FILE: 2_string.py
# Automatic Code Diagnostics & Inline Review Comments
# Total issue annotations added: 0
# Review Checklist:
#   * 1. Replace single-format `strptime` with the multi-format fallback helper (`parse_and_validate_date`).
#   * 2. Add structured logging to all `try/except` blocks instead of bare `except: pass`.
#   * 3. Move hardcoded endpoints and credentials into environment variables (`.env`).
#   * 4. Run `python test_repro.py` to verify that regional dates no longer trigger HTTP 400.
# ============================================================================

#Strings are not mutable 
# any change made during the programe can't chcange the original srting
# a="sidhi jain"
# print(a.capitalize())
# print(a.title())
# print(a.replace("s","r"))
# print(a.upper())
# print(a.endswith("in"))
# print(a.endswith("hi"))
#print(a[1:6:2])

# name =input("enetr your name ",)
# print("hello!",name)
# print(f"hello! {name}")

# name=input("enter name ")
# date= "26 June 2026"
# print(f'''Dear <|{name}|>,
# you are selected
# <|{date}|>''')

# letter = '''dear <|Name|>,
# You are selected!
# <|Date|> '''
# print(letter.replace("Name","Sidhi Jain").replace("Date","26 June 2026"))

# a="I am learning  python!"
# print(a.find("  "))

letter ="\"Dear Sidhi Jain,\n \tYou are doing well in python.\n Congratulatoins!\" "
print(letter)