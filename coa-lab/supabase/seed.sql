-- Sample course seed. Run AFTER 001_schema.sql, in the Supabase SQL editor. Safe to re-run.
-- Module 1 has authored notes and a practice quiz; other lectures are listed with
-- objectives and a "notes not written yet" placeholder for an administrator to fill in.
-- Nothing here is an official/past exam question: all quiz items are original practice questions.

insert into public.courses (slug, title, description, is_published)
values ('coa', 'Computer Organization and Architecture',
        'From number systems and logic design to CPU, memory, I/O and pipelining.', true)
on conflict (slug) do nothing;

insert into public.modules (course_id, position, title, description)
select c.id, v.pos, v.title, v.descr
from public.courses c,
(values
  (1, 'Number Systems and Data Representation', 'How computers represent numbers, text and codes.'),
  (2, 'Computer Arithmetic', 'Binary arithmetic, complements, overflow, multiplication and division.'),
  (3, 'Boolean Algebra and Logic Design', 'Boolean laws, gates, K-maps, combinational and sequential circuits.'),
  (4, 'Basic Computer Organization', 'Functional units, CPU organization, registers, instructions and the instruction cycle.'),
  (5, 'Control Unit', 'Hardwired and microprogrammed control, signals and timing.'),
  (6, 'Memory Organization', 'Memory hierarchy, RAM/ROM, cache, virtual memory.'),
  (7, 'Input/Output Organization', 'I/O interfaces, programmed I/O, interrupts, DMA, I/O processors.'),
  (8, 'Pipelining and Advanced Architecture', 'Pipelining, hazards, RISC/CISC, parallelism, performance, multicore.')
) as v(pos, title, descr)
where c.slug = 'coa'
on conflict (course_id, position) do nothing;

-- Lecture skeletons for all modules.
insert into public.lectures (module_id, position, title, summary, estimated_minutes, objectives, content_md)
select m.id, v.lpos, v.title, v.title, 20,
       array['Explain the key ideas of "' || v.title || '"', 'Solve basic problems on this topic'],
       E'## Overview\n' || v.title || E'\n\n_Detailed notes for this lecture have not been written yet. An administrator can add them from the content manager._'
from public.modules m
join public.courses c on c.id = m.course_id and c.slug = 'coa'
join (values
  (1,1,'Introduction to Computer Organization and Architecture'),
  (1,2,'Number Systems and Base Conversion'),
  (1,3,'Binary, Octal, Decimal and Hexadecimal'),
  (1,4,'Signed Number Representation'),
  (1,5,'Fixed-Point and Floating-Point Representation'),
  (1,6,'BCD, Gray Code and Character Encoding'),
  (2,1,'Binary Addition and Subtraction'),
  (2,2,'One''s Complement and Two''s Complement'),
  (2,3,'Signed Arithmetic and Overflow'),
  (2,4,'Multiplication Algorithms'),
  (2,5,'Division Algorithms'),
  (2,6,'Floating-Point Arithmetic'),
  (3,1,'Boolean Algebra Fundamentals'),
  (3,2,'Logic Gates and Truth Tables'),
  (3,3,'Boolean Expression Simplification'),
  (3,4,'Karnaugh Maps'),
  (3,5,'Combinational Circuits'),
  (3,6,'Sequential Circuits'),
  (4,1,'Functional Units of a Computer'),
  (4,2,'CPU Organization'),
  (4,3,'Registers and Register Transfer Language'),
  (4,4,'Instruction Formats and Addressing Modes'),
  (4,5,'Instruction Cycle'),
  (4,6,'Stack Organization'),
  (5,1,'Hardwired Control'),
  (5,2,'Microprogrammed Control'),
  (5,3,'Control Signals and Timing'),
  (5,4,'Instruction Execution and Control Flow'),
  (6,1,'Memory Hierarchy'),
  (6,2,'RAM and ROM'),
  (6,3,'Cache Memory'),
  (6,4,'Cache Mapping Techniques'),
  (6,5,'Virtual Memory'),
  (6,6,'Associative Memory'),
  (7,1,'I/O Interfaces'),
  (7,2,'Programmed I/O'),
  (7,3,'Interrupt-Driven I/O'),
  (7,4,'Direct Memory Access'),
  (7,5,'I/O Processors'),
  (8,1,'Instruction Pipelining'),
  (8,2,'Pipeline Hazards'),
  (8,3,'RISC and CISC'),
  (8,4,'Parallel Processing'),
  (8,5,'Performance Metrics'),
  (8,6,'Introduction to Multicore Processors')
) as v(mpos, lpos, title) on v.mpos = m.position
on conflict (module_id, position) do nothing;

-- Authored notes for Module 1 (overwrites the placeholder only while it is still the placeholder).
do $seed$
declare v_mod uuid;
begin
  select m.id into v_mod from public.modules m join public.courses c on c.id = m.course_id
  where c.slug = 'coa' and m.position = 1;

  update public.lectures set estimated_minutes = 20,
    summary = 'What a computer is, and the difference between organization and architecture.',
    objectives = array['Distinguish computer organization from computer architecture',
                       'Name the main functional units of a computer',
                       'Describe the stored-program concept'],
    content_md = $c$
## Organization vs. architecture
**Computer architecture** is what a programmer sees: the instruction set, data types, addressing modes and registers. **Computer organization** is how that is built in hardware: control signals, interfaces, memory technology and the datapath.

Example: whether a machine has a multiply instruction is an architectural decision. Whether it multiplies using a dedicated multiplier circuit or repeated addition is an organizational one.

## Main functional units
- **Input** devices bring data in.
- **Memory** stores instructions and data.
- **ALU** performs arithmetic and logic operations.
- **Control unit** fetches instructions and directs everything else.
- **Output** devices present results.

## Stored-program concept
Instructions and data both live in memory as binary patterns. The CPU repeatedly fetches an instruction, decodes it and executes it. This is the core idea behind the von Neumann model.

## Revision notes
- Architecture = the visible interface; organization = the implementation.
- The control unit and ALU together form the CPU.
$c$
  where module_id = v_mod and position = 1 and content_md like '%have not been written yet%';

  update public.lectures set estimated_minutes = 25,
    summary = 'Positional number systems and converting between bases.',
    objectives = array['Explain positional notation and the role of the radix',
                       'Convert integers between decimal and any base',
                       'Convert fractions between decimal and binary'],
    content_md = $c$
## Positional notation
In base *r*, each digit has a weight that is a power of *r*. The number 345 in base 10 means 3×10² + 4×10¹ + 5×10⁰.

## Any base to decimal
Multiply each digit by its weight and add.

Worked example: (1011)₂ = 1×8 + 0×4 + 1×2 + 1×1 = **11**

## Decimal to any base (integers)
Divide repeatedly by the base and read the remainders **from bottom to top**.

Worked example: 13 to binary
```
13 / 2 = 6  remainder 1
 6 / 2 = 3  remainder 0
 3 / 2 = 1  remainder 1
 1 / 2 = 0  remainder 1
```
Reading upward: **1101**.

## Decimal fractions to binary
Multiply the fraction by 2 repeatedly and read the integer parts from top to bottom.

Worked example: 0.625 to binary
```
0.625 x 2 = 1.25 -> 1
0.25  x 2 = 0.5  -> 0
0.5   x 2 = 1.0  -> 1
```
So 0.625 = **0.101**₂.

## Revision notes
- Integer conversion: divide, read remainders upward.
- Fraction conversion: multiply, read integer parts downward.
$c$
  where module_id = v_mod and position = 2 and content_md like '%have not been written yet%';

  update public.lectures set estimated_minutes = 20,
    summary = 'The four bases used in computing and shortcuts between them.',
    objectives = array['Recognize the digits of binary, octal, decimal and hexadecimal',
                       'Convert binary to octal and hexadecimal by grouping bits',
                       'Convert octal and hexadecimal to binary'],
    content_md = $c$
## The four bases
- Binary (base 2): digits 0, 1
- Octal (base 8): digits 0 to 7
- Decimal (base 10): digits 0 to 9
- Hexadecimal (base 16): digits 0 to 9 and A to F (A=10 ... F=15)

## Why grouping works
8 = 2³ and 16 = 2⁴, so one octal digit equals exactly **3 bits** and one hex digit equals exactly **4 bits**.

## Binary to hexadecimal
Group bits in fours starting from the right, then convert each group.

Worked example: 10111100₂
```
1011 -> B
1100 -> C
```
Result: **BC**₁₆.

## Binary to octal
Group in threes from the right: 101 111 100 → 5 7 4 = **574**₈.

## Octal to decimal
Worked example: (157)₈ = 1×64 + 5×8 + 7×1 = **111**.

## Revision notes
- 1 hex digit = 4 bits; 1 octal digit = 3 bits.
- Pad with leading zeros when the leftmost group is short.
$c$
  where module_id = v_mod and position = 3 and content_md like '%have not been written yet%';

  update public.lectures set estimated_minutes = 25,
    summary = 'Sign-magnitude, 1''s complement and 2''s complement.',
    objectives = array['Represent negative numbers in sign-magnitude, 1''s and 2''s complement',
                       'State the range of an n-bit signed number in each scheme',
                       'Explain why 2''s complement is used in practice'],
    content_md = $c$
## Three schemes
- **Sign-magnitude:** the leftmost bit is the sign (0 positive, 1 negative); the rest is the magnitude. It has two zeros (+0 and −0).
- **1's complement:** negate by flipping every bit. Also has two zeros.
- **2's complement:** negate by flipping every bit and adding 1. Has a single zero.

## Worked example: −5 in 8-bit 2's complement
```
+5        = 00000101
flip bits = 11111010
add 1     = 11111011
```
So −5 is **11111011**.

## Ranges for n bits
- Sign-magnitude and 1's complement: −(2ⁿ⁻¹ − 1) to +(2ⁿ⁻¹ − 1)
- 2's complement: **−2ⁿ⁻¹ to +(2ⁿ⁻¹ − 1)**

For 8 bits, 2's complement covers −128 to +127.

## Why 2's complement wins
Addition and subtraction use the same adder circuit, and there is only one representation of zero.

## Revision notes
- 2's complement of N in n bits = 2ⁿ − N.
- The extra negative value (−128 for 8 bits) has no positive counterpart.
$c$
  where module_id = v_mod and position = 4 and content_md like '%have not been written yet%';

  update public.lectures set estimated_minutes = 25,
    summary = 'Fixed-point layout and the IEEE 754 floating-point format.',
    objectives = array['Describe fixed-point representation and its limits',
                       'Identify the sign, exponent and mantissa fields of IEEE 754',
                       'Decode a simple single-precision value'],
    content_md = $c$
## Fixed point
The binary point sits at a fixed position. With 4 integer bits and 4 fraction bits, 0110.1000 means 6.5. It is simple and fast but has a small range.

## Floating point
A value is written as (−1)^s × 1.f × 2^(e − bias): a **sign** bit, an **exponent** and a **fraction (mantissa)**.

## IEEE 754 formats
- **Single precision (32 bits):** 1 sign bit, **8 exponent bits**, 23 fraction bits, bias 127.
- **Double precision (64 bits):** 1 sign bit, 11 exponent bits, 52 fraction bits, bias 1023.

## Worked example: 6.5 in single precision
6.5 = 110.1₂ = 1.101 × 2². Exponent field = 2 + 127 = 129 = 10000001₂. Fraction = 101 followed by zeros.
```
sign=0  exponent=10000001  fraction=10100000000000000000000
```

## Revision notes
- The leading 1 of a normalized mantissa is implied and not stored.
- Bias lets the exponent field be stored as an unsigned number.
$c$
  where module_id = v_mod and position = 5 and content_md like '%have not been written yet%';

  update public.lectures set estimated_minutes = 20,
    summary = 'BCD, Gray code, ASCII and Unicode.',
    objectives = array['Encode decimal digits in BCD',
                       'Convert between binary and Gray code',
                       'Explain the purpose of ASCII and Unicode'],
    content_md = $c$
## BCD (Binary Coded Decimal)
Each decimal digit is stored in its own 4-bit group.

Worked example: 59 → 5 = 0101, 9 = 1001 → **0101 1001**.

## Gray code
Consecutive values differ in exactly one bit, which avoids glitches in encoders.

Binary to Gray: the first bit is copied; every other Gray bit is the XOR of the current and previous binary bits.

Worked example: 101₂
```
G2 = 1
G1 = 1 xor 0 = 1
G0 = 0 xor 1 = 1
```
Gray code = **111**.

## Character encoding
- **ASCII:** 7-bit codes for 128 characters (letters, digits, punctuation, control codes).
- **Unicode:** a universal character set; UTF-8 encodes it using 1 to 4 bytes per character and is backward compatible with ASCII.

## Revision notes
- BCD wastes the codes 1010 to 1111.
- Gray code is unit-distance: adjacent codes differ by one bit.
$c$
  where module_id = v_mod and position = 6 and content_md like '%have not been written yet%';
end
$seed$;

-- Practice quiz for Module 1 (original questions, labelled practice).
do $seed$
declare
  v_mod uuid;
  v_quiz uuid;
  v_q uuid;
  r record;
  n int := 0;
begin
  select m.id into v_mod from public.modules m join public.courses c on c.id = m.course_id
  where c.slug = 'coa' and m.position = 1;

  insert into public.quizzes (module_id, title, kind, pass_percent, time_limit_minutes, max_attempts, display_mode)
  values (v_mod, 'Module 1 Practice Quiz', 'practice', 70, null, null, 'single')
  on conflict (module_id) do nothing;

  select id into v_quiz from public.quizzes where module_id = v_mod;
  if exists (select 1 from public.quiz_questions where quiz_id = v_quiz) then return; end if;

  for r in
    select * from (values
      ('What is the binary representation of decimal 13?', '["1011","1101","1110","1001"]'::jsonb, 1,
       '13 = 8 + 4 + 1, which is 1101 in binary.'),
      ('What is the hexadecimal value of the binary number 10111100?', '["BC","CB","AD","3C"]'::jsonb, 0,
       'Group as 1011 (B) and 1100 (C), giving BC.'),
      ('What is the 8-bit two''s complement representation of -5?', '["10000101","11111010","11111011","11111101"]'::jsonb, 2,
       '+5 is 00000101; flipping gives 11111010; adding 1 gives 11111011.'),
      ('What is the range of an 8-bit two''s complement integer?', '["-127 to +127","-128 to +127","-128 to +128","0 to 255"]'::jsonb, 1,
       'Two''s complement with n bits covers -2^(n-1) to 2^(n-1) - 1, so -128 to +127.'),
      ('What is the Gray code equivalent of binary 101?', '["111","110","101","011"]'::jsonb, 0,
       'Keep the first bit (1); then 1 xor 0 = 1 and 0 xor 1 = 1, giving 111.'),
      ('How many exponent bits does IEEE 754 single precision use?', '["5","8","11","23"]'::jsonb, 1,
       'Single precision uses 1 sign bit, 8 exponent bits and 23 fraction bits.'),
      ('What is the decimal value of the octal number 157?', '["111","117","103","127"]'::jsonb, 0,
       '1x64 + 5x8 + 7x1 = 64 + 40 + 7 = 111.'),
      ('What is the BCD representation of decimal 59?', '["0101 1001","0101 1010","0011 1011","1001 0101"]'::jsonb, 0,
       'BCD encodes each digit separately: 5 = 0101 and 9 = 1001.')
    ) as t(prompt, options, correct, expl)
  loop
    n := n + 1;
    insert into public.quiz_questions (quiz_id, position, prompt, options)
    values (v_quiz, n, r.prompt, r.options) returning id into v_q;
    insert into public.quiz_answer_keys (question_id, correct_index, explanation)
    values (v_q, r.correct, r.expl);
  end loop;
end
$seed$;
