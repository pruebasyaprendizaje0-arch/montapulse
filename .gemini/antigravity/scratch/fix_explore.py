import sys

file_path = r'c:\Users\Frank\OneDrive\Desktop\montapulse\pages\Explore.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# We want to replace lines from 1096 (index 1095) to 1102 (index 1101)
# Correct sequence from 1096:
new_lines = [
    '                                            );\n',
    '                                        })}\n',
    '                                    </div>\n',
    '                                )}\n',
    '                            </div>\n',
    '                        </div>\n',
    '                    </div>\n',
    '                )}\n',
    '            </div>\n'
]

# The current lines 1095 to 1102 (1-indexed) are:
# 1095: </div>
# 1096: );
# 1097: )}
# 1098: </div>
# 1099: </div>
# 1100: </div>
# 1101: )}
# 1102: </div>

# Let's replace from line 1096 (index 1095) to 1102 (index 1101)
lines[1095:1102] = new_lines

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
