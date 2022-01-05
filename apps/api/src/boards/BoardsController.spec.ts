import { BOARDS_ROOT, BOARDS_SINGULAR } from './BoardsRouter';
import { prisma } from '../prismaClient';
import generatePath from '../utils/generatePath';
import { BOARD_UPDATED_EVENT_NAME, PausedState, StartState } from '@retro-tool/api-interfaces';
import { TestCase } from '../utils/TestCase';
import { User } from '@prisma/client';
import dependencies from '../dependencies';

const mockSendEventToBoard = jest
  .spyOn(dependencies.namespaceService, 'sendEventToBoard')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  .mockImplementation(() => {});

describe('BoardsController', () => {
  let user: User;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: 'test@email.com',
        githubNickname: 'testUser',
        avatar: 'test-avatar',
      },
    });
  });

  const testBoard = {
    title: 'test board',
    columns: ['col1', 'col2'],
  };

  it('fetches a board', async () => {
    const board = await prisma.board.create({
      data: {
        title: 'testTitle',
        ownerId: user.id,
        boardAccesses: {
          create: { userId: user.id },
        },
      },
    });

    const response = await TestCase.make().actingAs(user).get(`/boards/${board.id}`);

    expect(response.status).toEqual(200);
    expect(response.body.board).toEqual(
      expect.objectContaining({
        id: board.id,
      }),
    );
  });

  it('throws an error if user is not invited to board', async () => {
    const board = await prisma.board.create({
      data: { title: 'testTitle', ownerId: user.id },
    });

    const response = await TestCase.make().actingAs(user).get(`/boards/${board.id}`);

    expect(response.status).toEqual(500);
  });

  it('lists the boards', async () => {
    const board = await prisma.board.create({
      data: {
        title: 'testTitle',
        ownerId: user.id,
        boardAccesses: { create: [{ userId: user.id }] },
      },
    });

    const response = await TestCase.make().actingAs(user).get(BOARDS_ROOT).expect(200);
    expect(response.body).toEqual({
      boards: expect.arrayContaining([expect.objectContaining({ id: board.id })]),
    });
  });

  it('creates a board', async () => {
    const response = await TestCase.make().actingAs(user).post(BOARDS_ROOT).send(testBoard).expect(200);

    expect(response.body.board).toEqual(expect.objectContaining({ title: 'test board' }));
  });

  it('updates a board', async () => {
    const board = await prisma.board.create({
      data: {
        title: 'Random Name',
        ownerId: user.id,
      },
    });

    const newTitle = { title: 'Name Random' };

    const response = await TestCase.make()
      .actingAs(user)
      .patch(generatePath(BOARDS_SINGULAR, { id: board.id }))
      .send(newTitle);

    expect(response.body.board).toEqual(expect.objectContaining(newTitle));
    expect(await prisma.board.findFirst({ where: { id: board.id } })).toEqual(expect.objectContaining(newTitle));
    expect(mockSendEventToBoard).toHaveBeenCalledWith(board.id, {
      type: BOARD_UPDATED_EVENT_NAME,
      payload: expect.objectContaining(newTitle),
    });
  });

  it('deletes a board', async () => {
    const board = await prisma.board.create({
      data: {
        title: 'Random Name',
        ownerId: user.id,
      },
    });

    const response = await TestCase.make()
      .actingAs(user)
      .delete(generatePath(BOARDS_SINGULAR, { id: board.id }));

    expect(response.status).toEqual(200);
    const updatedBoard = await prisma.board.findFirst({
      where: { id: board.id },
    });
    expect(updatedBoard).toBeTruthy();
    expect(updatedBoard.deleted).toBeTruthy();
  });

  it('starts a boards timer', async () => {
    const board = await prisma.board.create({
      data: {
        title: 'testTitle',
        ownerId: user.id,
        boardAccesses: {
          create: { userId: user.id },
        },
      },
    });

    expect(board.timer).toBeNull();

    const timer: StartState = {
      type: 'start',
      state: {
        startTime: 0,
        endTime: 100,
      },
    };

    const response = await TestCase.make().actingAs(user).post(`/boards/${board.id}/timers`).send({ timer });

    expect(response.status).toEqual(200);
    expect(mockSendEventToBoard).toHaveBeenCalledWith(board.id, {
      type: BOARD_UPDATED_EVENT_NAME,
      payload: expect.objectContaining({ timer: timer }),
    });
    expect((await prisma.board.findFirst({ where: { id: board.id } })).timer).toEqual(timer);
  });

  it('pauses a boards timer', async () => {
    const board = await prisma.board.create({
      data: {
        title: 'testTitle',
        ownerId: user.id,
        boardAccesses: {
          create: { userId: user.id },
        },
        timer: {
          type: 'start',
          state: {
            startTime: 0,
            endTime: 100,
          },
        },
      },
    });

    const pausedTimer: PausedState = {
      type: 'paused',
      state: {
        totalDuration: 50,
      },
    };

    const response = await TestCase.make()
      .actingAs(user)
      .post(`/boards/${board.id}/timers`)
      .send({ timer: pausedTimer });

    expect(response.status).toEqual(200);
    expect(mockSendEventToBoard).toHaveBeenCalledWith(board.id, {
      type: BOARD_UPDATED_EVENT_NAME,
      payload: expect.objectContaining({ timer: pausedTimer }),
    });
    expect((await prisma.board.findFirst({ where: { id: board.id } })).timer).toEqual(pausedTimer);
  });

  it('returns an error if you start a timer after it has already started', async () => {
    const board = await prisma.board.create({
      data: {
        title: 'testTitle',
        ownerId: user.id,
        boardAccesses: {
          create: { userId: user.id },
        },
        timer: {
          type: 'start',
          state: {
            startTime: 0,
            endTime: 100,
          },
        },
      },
    });
    expect(board.timer).not.toBeNull();

    const startTimer: StartState = {
      type: 'start',
      state: {
        startTime: 0,
        endTime: 100,
      },
    };

    const response = await TestCase.make()
      .actingAs(user)
      .post(`/boards/${board.id}/timers`)
      .send({ timer: startTimer });

    expect(response.status).toEqual(400);
  });

  it('transfers ownership', async () => {
    const board = await prisma.board.create({
      data: {
        title: 'Random Name',
        ownerId: user.id,
      },
    });

    const secondUser = await prisma.user.create({
      data: {
        email: 'secondUser@email.com',
        githubNickname: 'secondUser',
        avatar: 'test-avatar',
      },
    });

    const response = await TestCase.make()
      .actingAs(user)
      .post(`/boards/${board.id}/transfer`)
      .send({ githubNickname: secondUser.githubNickname });

    console.log(response.body);

    expect(response.status).toEqual(200);
    expect((await prisma.board.findFirst({ where: { id: board.id } })).ownerId).toEqual(secondUser.id);
  });

  afterEach(async () => {
    await prisma.column.deleteMany();
    await prisma.boardAccess.deleteMany();
    await prisma.board.deleteMany();
  });
});
