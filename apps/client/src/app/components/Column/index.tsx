import { Board, Column as ColumnType } from '@prisma/client';
import { Heading } from '@chakra-ui/react';
import {
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
  DroppableProvided,
  DroppableStateSnapshot,
} from 'react-beautiful-dnd';
import { ColumnWidth, GAP } from '../../theme/sizes';
import { useBoard } from '../../hooks/boards';
import { useDialogs } from '../../dialog-manager';
import { useDeleteColumn } from '../../hooks/columns';
import { DeleteIcon } from '@chakra-ui/icons';
import { useCards, useCreateCard } from '../../hooks/cards';
import { KeyboardEvent, useEffect, useMemo, useRef } from 'react';
import { Card } from '../Card';
import { CardType } from '@retro-tool/api-interfaces';
import { eventEmitter } from '../../utils/EventEmitter';
import { useBoardState } from '../../contexts/BoardProvider';
import { classNames } from '../../utils/classNames';

type ColumnProps = {
  column: ColumnType;
  board: Board;
  title: string;
  index: number;
};

type CardsListProps = {
  cards: CardType[];
  column: ColumnType;
  listType: string;
  listId: string;
  name: string;
};

const containerClasses = (isDragging: boolean) => {
  return classNames(
    'h-full my-2 rounded flex flex-col p-2 items-start overflow-y-scroll',
    isDragging
      ? 'bg-gray-200 dark:bg-gray-600'
      : 'bg-gray-100 dark:bg-gray-700',
  );
};

export function CardList({
  cards,
  column,
  listType,
  listId,
  name,
}: CardsListProps) {
  const cardsRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cardsContainerRef = useRef<HTMLDivElement | null>();

  useEffect(() => {
    const onFocus = (id: string) => {
      const htmlElement = cardsRefs.current[id];
      const containerElement = cardsContainerRef.current;
      console.log({ htmlElement, containerElement });
      htmlElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    };
    eventEmitter.addListener('focus', onFocus);
    return () => {
      eventEmitter.removeListener('focus', onFocus);
    };
  }, []);

  return (
    <Droppable droppableId={listId} type={listType} isCombineEnabled={true}>
      {(
        dropProvided: DroppableProvided,
        dropSnapshot: DroppableStateSnapshot,
      ) => (
        <div
          className={containerClasses(dropSnapshot.isDraggingOver)}
          ref={(ref: any) => {
            dropProvided.innerRef(ref);
            cardsContainerRef.current = ref;
          }}
          data-testid={name}
          {...dropProvided.droppableProps}
        >
          {cards?.map((card, index) => (
            <Card
              key={card.id}
              card={card}
              column={column}
              index={index}
              ref={(ref) => {
                cardsRefs.current[card.id] = ref;
              }}
            />
          ))}
          {dropProvided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default function Column({ column, board, title, index }: ColumnProps) {
  const { mutateAsync: deleteColumnAsync } = useDeleteColumn();
  const { openDialog } = useDialogs();
  const { refetch } = useBoard(board.id);
  const { cards } = useCards(column.id);
  const { createCard } = useCreateCard(column.id);
  const newCardRef = useRef<HTMLTextAreaElement>(null);
  const { isBoardOwner } = useBoardState();

  const filteredCards = useMemo(() => {
    return cards?.filter((card) => card.parentId == null) ?? [];
  }, [cards]);

  const submitCard = async (event: any) => {
    event.preventDefault();
    if (!newCardRef.current || !newCardRef.current.value?.length) return;

    await createCard({
      content: newCardRef.current.value ?? '',
    });

    newCardRef.current.value = '';
  };

  const deleteColumn = async (columnId: string) => {
    openDialog('confirmation', {
      title: 'Are you sure?',
      message: 'Are you sure you want to delete the column?',
      onSuccess: async () => {
        await deleteColumnAsync({ columnId });
        await refetch();
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onCancel: () => {},
    });
  };

  const onInputKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.shiftKey && e.code === 'Enter') {
      e.preventDefault();
      submitCard(e);
      return;
    }
  };

  const inputPlaceholder =
    'Add a new card.\nPress Enter to submit.\nPress Shift + Enter for a new line';

  return (
    <Draggable draggableId={title} index={index} isDragDisabled={!isBoardOwner}>
      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
        <div
          className="flex-shrink-0 last:mr-0"
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            width: `${ColumnWidth}px`,
            marginRight: GAP,
            ...provided.draggableProps.style,
          }}
          data-testid={`column-${index}`}
        >
          <div
            className="flex items-center justify-between"
            {...provided.dragHandleProps}
          >
            <Heading size="md">{column.title}</Heading>
            {isBoardOwner && (
              <button onClick={() => deleteColumn(column.id)}>
                <DeleteIcon />
              </button>
            )}
          </div>

          <div className="h-full flex flex-col">
            <CardList
              name={`card-list-${index}`}
              listType="CARD"
              listId={column.id}
              cards={filteredCards}
              column={column}
            />
            <div
              className="rounded mt-2 overflow-hidden bg-gray-100 dark:bg-gray-700"
              onSubmit={submitCard}
            >
              <textarea
                className="outline-none w-full h-64 rounded bg-transparent border-none"
                ref={newCardRef}
                data-testid={`column-input-${index}`}
                placeholder={inputPlaceholder}
                onKeyPress={onInputKeyPress}
              />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
