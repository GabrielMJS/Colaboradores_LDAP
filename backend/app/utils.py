import os

def to_title_case(text):
    """Converte texto para Title Case, respeitando preposições brasileiras."""
    if not text: return text
    exceptions = ['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'para', 'com']
    words = text.lower().split()
    if not words: return text
    
    result = [words[0].capitalize()]
    for word in words[1:]:
        if word in exceptions:
            result.append(word)
        else:
            result.append(word.capitalize())
    return " ".join(result)
