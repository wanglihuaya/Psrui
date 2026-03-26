
# default target. Typing 'make' on its own runs this
help:
	@echo "To build psrcat:"
	@echo " $ make psrcat"
	@echo ""
	@echo "To run psrcat:"
	@echo " $ setenv PSRCAT_FILE <path/to/psrcat.db>"
	@echo " $ ./psrcat"
	@echo ""
	@echo "To clean up afterward"
	@echo " $ make clean"
	@echo ""
	@echo "If that fails, try:"
	@echo " $ sh makeit"
	@echo ""

#for programmers
show:
	@echo "Modules: $(MODULES)"
	@echo "Objects: $(OBJECTS)"
	@echo "Lib modules: $(LIB_MODULES)"
	@echo "Lib objects: $(LIB_OBJECTS)"

MAIN      := psrcat.c
# We don't want to include these
PSRCAT_V2 := psrcatV2_V1.c sqliteRoutines.c

MODULES := $(wildcard *.c)

LIB_MODULES := $(filter-out $(MAIN), $(MODULES))
LIB_MODULES := $(filter-out $(PSRCAT_V2), $(LIB_MODULES))
LIB_OBJECTS := $(patsubst %.c, %.o, $(LIB_MODULES))

CC = /usr/bin/gcc
CFLAGS = -fcommon

all: psrcat

psrcat: psrcat.o libpsrcat.a
	$(CC) -L. -o $@ $< -lpsrcat -lm

psrcat.o: psrcat.c
	$(CC) $(CFLAGS) -c psrcat.c

libpsrcat.a: $(LIB_OBJECTS)
	 ar rcv $@ $+
	 ranlib $@

$(LIB_OBJECTS): %.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f *.o *.a *.gch psrcat

.PHONY: help show clean
